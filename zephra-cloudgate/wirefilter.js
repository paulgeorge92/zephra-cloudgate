// ===============================
// 🔧 Operator Registry
// ===============================
const OperatorRegistry = {
  Operators: [
    { wf: '==', ui: 'equals', neg: false },
    { wf: '!=', ui: 'not_equals', neg: false },
    { wf: '>', ui: 'greater_than', neg: false },
    { wf: '>=', ui: 'greater_than_equal', neg: false },
    { wf: '<', ui: 'less_than', neg: false },
    { wf: '<=', ui: 'less_than_equal', neg: false },
    { wf: 'contains', ui: 'contains', neg: false },
    { wf: 'in', ui: 'in', neg: false },

    // negated forms
    { wf: 'in', ui: 'not in', neg: true },
    { wf: '==', ui: 'not_equals', neg: true },
    { wf: 'contains', ui: 'not_contains', neg: true }
  ]
};

// ===============================
// 🧪 Helpers
// ===============================
const AND = 'and';
const OR = 'or';

function isKeyword(v) {
  return ['true', 'false', 'null'].includes(v);
}

function isSpecialValue(v) {
  return /^(\$|ip\.|http\.|cf\.|geo\.)/.test(v);
}

function escapeString(v) {
  return `"${`${v}`.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

// ===============================
// 🧱 BUILDER (JSON → Wirefilter)
// ===============================
function formatRhs(value) {
  if (Array.isArray(value)) {
    return `{${value.map(formatRhs).join(' ')}}`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }

  if (typeof value === 'string') {
    if (value.startsWith('$')) return value;
    return escapeString(value);
  }

  return value;
}

function buildCondition({ lhs, operator, rhs, groupingIndex, neg, splat }) {
  if (!lhs || !operator) return;

  let expr = `${lhs} ${operator} ${formatRhs(rhs)}`;

  if (splat) {
    expr = `any(${lhs}[*] ${operator} ${formatRhs(rhs)})`;
  }

  if (neg) {
    expr = `not(${expr})`;
  }

  return expr;
}

function buildWirefilter(conditions) {
  const groups = {};

  for (const c of conditions) {
    const group = c.groupingIndex || 0;
    const expr = buildCondition(c);
    if (!expr) continue;

    if (!groups[group]) groups[group] = [];
    groups[group].push(expr);
  }

  const grouped = Object.values(groups).map((group) => (group.length > 1 ? `(${group.join(` ${AND} `)})` : group[0]));

  return grouped.join(` ${OR} `);
}

// ===============================
// 🧠 PARSER (Wirefilter → JSON)
// ===============================

class WirefilterParseError extends Error {}

const EXPRESSION_REGEX = /^(?<lhs>[^\s]*)\s(?<operator>[^\s]*)\s(?<rhs>.*)$/;
const NOT_REGEX = /^not\((?<expression>.*)\)$/;
const ANY_REGEX = /^any\((?<lhs>[^\s]*)\[\*?\]\s(?<operator>[^\s]*)\s(?<rhs>.*)\)$/;
const SET_REGEX = /^\{(?<expression>.*)\}$/;

function mapOperator(op, neg) {
  return OperatorRegistry.Operators.find((o) => o.wf === op && o.neg === neg)?.ui;
}

function isIPv4(value) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value);
}

function isNumber(value) {
  return /^-?\d+(\.\d+)?$/.test(value);
}

function parseValue(value) {
  if (!value) return value;

  // 🔹 Quoted string
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }

  // 🔹 IP address (VERY IMPORTANT FIX)
  if (isIPv4(value)) {
    return value; // keep as string
  }

  // 🔹 Keywords / special values
  if (isKeyword(value) || isSpecialValue(value) || value.startsWith('$')) {
    return value;
  }

  // 🔹 Strict number check (not parseInt!)
  if (isNumber(value)) {
    return Number(value);
  }

  return value;
}

function parseRhs(rhs) {
  const setMatch = SET_REGEX.exec(rhs);

  if (setMatch) {
    return setMatch.groups.expression.split(' ').map(parseValue);
  }

  return parseValue(rhs);
}

function splitSafe(input, separator) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }

    if (!inQuotes && input.substring(i, i + separator.length) === separator) {
      result.push(current.trim());
      current = '';
      i += separator.length - 1;
      continue;
    }

    current += ch;
  }

  if (current) result.push(current.trim());

  return result;
}

function parseExpression(expr, groupingIndex) {
  const notMatch = NOT_REGEX.exec(expr);
  const isNeg = !!notMatch;
  const inner = notMatch?.groups.expression || expr;

  const match = ANY_REGEX.exec(inner) || EXPRESSION_REGEX.exec(inner);

  if (!match) {
    throw new WirefilterParseError(`Invalid expression: ${expr}`);
  }

  return {
    lhs: match.groups.lhs,
    operator: mapOperator(match.groups.operator, isNeg),
    rhs: parseRhs(match.groups.rhs),
    groupingIndex
  };
}

function parseWirefilter(input) {
  const orGroups = splitSafe(input, ` ${OR} `);

  return orGroups.map((group, i) => splitSafe(group.replace(/^\(|\)$/g, ''), ` ${AND} `).map((expr) => parseExpression(expr, i))).flat();
}

// ===============================
// 🚀 EXPORT
// ===============================
export { buildWirefilter, parseWirefilter };
