import firewallConfig from './firewall-config.json';

export interface FirewallField {
  ui_string: string;
  wf_string: string;
  filters: string[];
  splat: boolean;
  operators: string[];
  actions: string[];
  condition_type: 'traffic' | 'identity' | '';
  deprecated: boolean;
  wf_string_neg?: string;
  values?: string[];
}

export interface FirewallOperator {
  ui_string: string;
  wf_string: string;
  neg: boolean;
  rhs_set: boolean;
  rhs_list: boolean;
  rhs_regex: boolean;
  deprecated: boolean;
}

export interface FirewallAction {
  ui_string: string;
  wf_string: string;
  deprecated: boolean;
  color: string;
  filters?: string[];
}

export interface FirewallFieldType {
  ui_string: string;
  field_type: string;
}

const CONFIG = firewallConfig as {
  Fields: FirewallField[];
  Operators: FirewallOperator[];
  Actions: FirewallAction[];
  FieldTypes: FirewallFieldType[];
};

export interface ParsedCondition {
  field: string;
  operator: string;
  value: string;
  isList: boolean;
  logic?: 'and' | 'or';
}

class WirefilterParseError extends Error {}

const AND = 'and';
const OR = 'or';
const EXPRESSION_REGEX = /^([^\s]+)\s+([^\s]+)\s+(.*)$/;
const NOT_REGEX = /^not\((.*)\)$/;
const LEGACY_NOT_REGEX = /^not\s+(.*)$/;
const ANY_REGEX = /^any\(([^\s]+)\[\*?\]\s+([^\s]+)\s+(.*)\)$/;
const SET_REGEX = /^\{(.*)\}$/;

function isKeyword(value: string): boolean {
  return ['true', 'false', 'null'].includes(value);
}

function isSpecialValue(value: string): boolean {
  return /^(\$|ip\.|http\.|cf\.|geo\.)/.test(value);
}

function isIPv4(value: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
}

function isNumber(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value);
}

function escapeString(value: unknown): string {
  return `"${`${value}`.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function parseValue(value: string): string | number | boolean | null {
  if (!value) return value;

  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  if (isIPv4(value)) return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (isSpecialValue(value) || value.startsWith('$')) return value;
  if (isNumber(value)) return Number(value);

  return value;
}

function splitSafe(input: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let escaped = false;
  let parenDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      current += ch;
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }

    if (!inQuotes) {
      if (ch === '(') parenDepth++;
      if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);

      if (parenDepth === 0 && braceDepth === 0 && input.substring(i, i + separator.length) === separator) {
        result.push(current.trim());
        current = '';
        i += separator.length - 1;
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) result.push(current.trim());

  return result;
}

function stripOuterParens(input: string): string {
  let expression = input.trim();

  while (expression.startsWith('(') && expression.endsWith(')')) {
    let depth = 0;
    let inQuotes = false;
    let escaped = false;
    let wrapsWholeExpression = true;

    for (let i = 0; i < expression.length; i++) {
      const ch = expression[i];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (inQuotes) continue;

      if (ch === '(') depth++;
      if (ch === ')') depth--;

      if (depth === 0 && i < expression.length - 1) {
        wrapsWholeExpression = false;
        break;
      }
    }

    if (!wrapsWholeExpression) break;
    expression = expression.slice(1, -1).trim();
  }

  return expression;
}

function splitSetValues(input: string): string[] {
  return splitSafe(input, ' ');
}

function parseRhs(rhs: string): string | number | boolean | null | Array<string | number | boolean | null> {
  const setMatch = SET_REGEX.exec(rhs.trim());

  if (setMatch) {
    return splitSetValues(setMatch[1]).filter(Boolean).map(parseValue);
  }

  return parseValue(rhs.trim());
}

function mapOperator(wfOperator: string, neg: boolean, rhs: unknown): string {
  const isList = typeof rhs === 'string' && rhs.startsWith('$');
  const match = CONFIG.Operators.find((operator) => operator.wf_string === wfOperator && operator.neg === neg && operator.rhs_list === isList);

  if (match) return match.ui_string;

  const fallback = CONFIG.Operators.find((operator) => operator.wf_string === wfOperator && operator.neg === neg);

  if (fallback) return fallback.ui_string;

  if (wfOperator === '!=' && !neg) return '!=';

  return wfOperator;
}

function normalizeParsedValue(value: string | number | boolean | null | Array<string | number | boolean | null>): string {
  if (Array.isArray(value)) {
    return value.map((item) => (item === null ? 'null' : String(item))).join(', ');
  }

  if (value === null) return 'null';
  if (typeof value === 'string' && value.startsWith('$')) return value.slice(1);

  return String(value);
}

function parseSingleCondition(segment: string, logic?: 'and' | 'or'): ParsedCondition | null {
  const expr = stripOuterParens(segment);
  const notMatch = NOT_REGEX.exec(expr) || LEGACY_NOT_REGEX.exec(expr);
  const isNeg = !!notMatch;
  const inner = notMatch?.[1] || expr;
  const match = ANY_REGEX.exec(inner) || EXPRESSION_REGEX.exec(inner);

  if (!match) {
    throw new WirefilterParseError(`Invalid expression: ${segment}`);
  }

  const [, lhs, wfOperator, rhsExpression] = match;
  const rhs = parseRhs(rhsExpression);
  const operator = mapOperator(wfOperator, isNeg, rhs);

  return {
    field: lhs,
    operator,
    value: normalizeParsedValue(rhs),
    isList: typeof rhs === 'string' && rhs.startsWith('$'),
    logic
  };
}

export function parseWirefilter(expr: string): ParsedCondition[] {
  if (!expr) return [];

  const conditions: ParsedCondition[] = [];
  const orGroups = splitSafe(expr, ` ${OR} `);

  for (let groupIndex = 0; groupIndex < orGroups.length; groupIndex++) {
    const group = stripOuterParens(orGroups[groupIndex]);
    const andExpressions = splitSafe(group, ` ${AND} `);

    for (let expressionIndex = 0; expressionIndex < andExpressions.length; expressionIndex++) {
      const logic = conditions.length === 0 ? undefined : expressionIndex === 0 ? 'or' : 'and';
      const parsed = parseSingleCondition(andExpressions[expressionIndex], logic);

      if (parsed) conditions.push(parsed);
    }
  }

  return conditions;
}

export interface WirefilterBlock {
  logic: 'AND' | 'OR';
  conditions: {
    field: string;
    operator: string;
    value: string;
  }[];
}

function valueLooksNumeric(value: string): boolean {
  return isNumber(value);
}

function formatRhsValue(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith('$')) return trimmed;
  if (isKeyword(trimmed) || isSpecialValue(trimmed)) return trimmed;
  if (valueLooksNumeric(trimmed)) return trimmed;

  return escapeString(trimmed);
}

function formatRhs(value: string, operator: FirewallOperator): string {
  if (operator.rhs_list) {
    return value.startsWith('$') ? value : `$${value}`;
  }

  if (operator.rhs_set) {
    const values = splitSafe(value.replaceAll(',', ' '), ' ').filter(Boolean);
    return `{${values.map(formatRhsValue).join(' ')}}`;
  }

  return formatRhsValue(value);
}

function buildCondition(condition: WirefilterBlock['conditions'][number]): string {
  const fieldCfg = CONFIG.Fields.find((field) => field.wf_string === condition.field);
  const opCfg = CONFIG.Operators.find((operator) => operator.ui_string === condition.operator);

  if (!fieldCfg || !opCfg || !condition.value) return '';

  const rhs = formatRhs(condition.value, opCfg);
  let expr = `${fieldCfg.wf_string} ${opCfg.wf_string} ${rhs}`;

  if (fieldCfg.splat) {
    expr = `any(${fieldCfg.wf_string}[*] ${opCfg.wf_string} ${rhs})`;
  }

  if (opCfg.neg) {
    expr = `not(${expr})`;
  }

  return expr;
}

export function stringifyWirefilter(blocks: WirefilterBlock[]): string {
  if (!blocks || blocks.length === 0) return '';

  return blocks
    .filter((b) => b.conditions && b.conditions.length > 0)
    .map((block) => {
      const blockExpr = block.conditions.map(buildCondition).filter(Boolean).join(` ${AND} `);

      return blockExpr.includes(` ${AND} `) ? `(${blockExpr})` : blockExpr;
    })
    .join(' or ');
}

// Dynamic Helper Functions

export function getSelectors(layer: string, conditionType: 'traffic' | 'identity'): FirewallField[] {
  const layerKey = layer.toLowerCase() === 'network' ? 'l4' : layer.toLowerCase();

  return CONFIG.Fields.filter((f) => !f.deprecated && f.filters.includes(layerKey) && f.condition_type === conditionType);
}

export function getOperatorsForField(fieldWf: string): FirewallOperator[] {
  const field = CONFIG.Fields.find((f) => f.wf_string === fieldWf);
  if (!field) return [];

  return CONFIG.Operators.filter((op) => !op.deprecated && field.operators.includes(op.ui_string));
}

export function getActionsForLayer(layer: string): FirewallAction[] {
  const layerKey = layer.toLowerCase() === 'network' ? 'l4' : layer.toLowerCase();

  return CONFIG.Actions.filter((a) => !a.deprecated && (!a.filters || a.filters.includes(layerKey)));
}

export function getActionConfig(action: string): FirewallAction | undefined {
  const normalizedAction = action.toLowerCase();

  return CONFIG.Actions.find((a) => a.wf_string.toLowerCase() === normalizedAction || a.ui_string.toLowerCase() === normalizedAction);
}

export function getListTypeForField(fieldWf: string): 'IP' | 'DOMAIN' | 'EMAIL' | 'URL' | undefined {
  const field = CONFIG.Fields.find((f) => f.wf_string === fieldWf);
  if (!field) return undefined;

  const fieldType = CONFIG.FieldTypes.find((ft) => ft.ui_string === field.ui_string)?.field_type;
  if (fieldType?.includes('ip_address')) return 'IP';

  if (field.ui_string.toLowerCase() === 'url') return 'URL';
  if (field.ui_string.toLowerCase() === 'domain' || field.ui_string.toLowerCase() === 'host') return 'DOMAIN';

  if (fieldType?.includes('email')) return 'EMAIL';
  return undefined;
}

// Legacy Map for UI Labels (Dynamically built)
const wf_string_labels = CONFIG.Fields.reduce(
  (acc, f) => {
    acc[f.wf_string] = f.ui_string;
    return acc;
  },
  {} as Record<string, string>
);
const wf_neg_lables = CONFIG.Fields.filter((f) => !!f.wf_string_neg).reduce(
  (acc, f) => {
    if (f.wf_string_neg) acc[f.wf_string_neg] = f.ui_string;
    return acc;
  },
  {} as Record<string, string>
);

export const FIELD_LABELS: Record<string, string> = {
  ...wf_string_labels,
  ...wf_neg_lables
};

export const OPERATORS = CONFIG.Operators.map((op) => {
  let label = op.ui_string;
  if (op.ui_string === '==') label = 'is';
  else if (op.ui_string === '!=') label = 'is not';
  else if (op.ui_string === 'in') label = 'is in';
  else if (op.ui_string === 'not in') label = 'is not in';

  return {
    id: op.ui_string,
    label: label
  };
});
