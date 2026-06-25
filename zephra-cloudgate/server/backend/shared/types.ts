/**
 * Shared data models and interfaces for Zephra CloudGate
 */

export type UserRole = 'ADMIN' | 'MEMBER' | 'GUEST';


export enum ApplicationExposureTypeEnum {
  PUBLIC = 'PUBLIC',
  PUBLIC_WITH_ACCESS = 'PUBLIC_WITH_ACCESS',
  WARP = 'WARP'
}

export interface AccessPolicy {
  id: string;
  name: string;
  account_id: string;
  decision: string; // 'allow', 'deny', 'bypass', etc.
  app_count?: number;
  approval_groups?: {
    approvals_needed?: number;
    email_addresses?: string[];
    email_list_uuid?: string;
  }[];
  approval_required?: boolean;
  include?: AccessCondition[];
  exclude?: AccessCondition[];
  require?: AccessCondition[];
  created_at: string;
  updated_at: string;
  session_duration?: string;
  connection_rules?: {
    rdp?: {
      allowed_clipboard_local_to_remote_formats?: string[];
      allowed_clipboard_remote_to_local_formats?: string[];
    };
  };
  isolation_required?: boolean;
  purpose_justification_required?: boolean;
}

export interface AccessApp {
  id: string;
  created_at: string;
  custom_deny_url?: string;
  custom_non_identity_deny_url?: string;
  domain: string;
  logo_url: string;
  name: string;
  policies: AccessPolicy[];
  session_duration: string;
  type: string;
  updated_at: string;
}

export interface AccessCondition {
  any_valid_service_token?: Record<string, never>;
  auth_context?: { id: string; ac_id: string; identity_provider_id: string };
  auth_method?: { auth_method: string };
  azureAD?: { id: string; identity_provider_id: string };
  certificate?: Record<string, never>;
  common_name?: { common_name: string };
  device_posture?: { integration_uid: string };
  email_domain?: { domain: string };
  everyone_domain?: { domain: string };
  email?: { email: string };
  everyone?: Record<string, never>;
  external_evaluation?: { evaluate_url: string; keys_url: string };
  geo?: { country_code: string };
  group?: { id: string };
  'github-organization'?: { identity_provider_id: string; name: string };
  github_team?: { identity_provider_id: string; name: string; team: string };
  gsuite_group?: { email: string; identity_provider_id: string };
  login_method?: { id: string };
  ip_list?: { id: string };
  ip?: { ip: string };
  okta?: { identity_provider_id: string; name: string };
  saml_group?: { attribute_name: string; attribute_value: string; identity_provider_id: string };
  oidc?: { claim_name: string; claim_value: string; identity_provider_id: string };
  service_token?: { token_id: string };
  linked_app_token?: { app_uid: string };
  user_risk_score?: { user_risk_score: ('low' | 'medium' | 'high')[] };
}

export interface HealthStatus {
  status: 'UNKNOWN' | 'ONLINE' | 'OFFLINE' | 'UNSUPPORTED';
  message: string;
  statusCode?: number;
}

export interface Application extends CreateApplicationData {
  id: string;
  createdAt: string;
  updatedAt: string;
  health: HealthStatus;
}

export interface ApplicationPolicy {
  type: 'OPEN' | 'RESTRICTED';
  policyId?: string; // For RESTRICTED type, this will be the ID of the Cloudflare Access Policy
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface CloudflareConfigData {
  accountId: string;
  email: string;
  teamName?: string;
  globalApiKey?: string;
  apiToken?: string;
}

export interface SetupVerificationResult {
  token: {
    success: boolean;
    message: string;
  };
  account: {
    success: boolean;
    message: string;
  };
  apikey: {
    success: boolean;
    message: string;
  };
  smtp: {
    success: boolean;
    message: string;
  };
}

export interface CreateApplicationData {
  name: string;
  logoUrl?: string;
  publicUrl?: string[];
  destinationType: 'URI' | 'IP';
  destinationUrl: string;
  exposureType: ApplicationExposureTypeEnum;
  tunnelId?: string;
  policy?: ApplicationPolicy;
  zoneId?: string;
}

export interface CreateUserData {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
}

export interface CpuStats {
  usage: number;
  cores: number;
  model: string;
}

export interface DashboardSummary {
  applications: number;
  tunnels: number;
  users: number;
  devices: number;
}

export interface Device {
  id: string;
  active_registrations: number;
  last_seen_at: string;
  name: string;
  client_version?: string;
  deleted_at?: string | null;
  device_type?: string;
  hardware_id?: string;
  user?: {
    id?: string;
    email?: string;
    name?: string;
  };
  mac_address?: string;
  manufacturer?: string;
  model: string;
  os_version?: string;
  os_version_extra?: string;
  public_ip?: string;
}

export interface DeviceProfile {
  policy_id: string;
  name: string;
  description: string;
  default: boolean;
  enabled: boolean;
  match: string;
  precedence: number;
  allow_mode_switch: boolean;
  allow_updates: boolean;
  allowed_to_leave: boolean;
  auto_connect: number;
  captive_portal: number;
  disable_auto_fallback: boolean;
  service_mode_v2: {
    mode: string;
  };
  gateway_unique_id: string;
  support_url: string;
  switch_locked: boolean;
  include: {
    address?: string;
    host?: string;
    description: string;
  }[];
  always_include: {
    ip: string;
  }[];
  always_exclude: {
    ip: string;
  }[];
  exclude_office_ips: boolean;
  fallback_domains: {
    suffix: string;
  }[];
  dns_search_suffixes: string[];
  register_interface_ip_with_dns: boolean;
  sccm_vpn_boundary_support: boolean;
  speed_test_settings: {
    exclude_servers: {
      throughput_base_url: string;
      turn_server_host_with_port: string;
    };
    include_servers: {
      throughput_base_url: string;
      turn_server_host_with_port: string;
    };
    exclude_ips: { ip: string }[];
    include_ips: { ip: string }[];
  };
  enable_netbt: boolean;
  tunnel_protocol: string;
}

export interface ServerProfile {
  name: string;
  logoUrl?: string;
  website?: string;
  description?: string;
}

export interface DiskStats {
  label: string;
  used: string;
  total: string;
  usedPercent: number;
  description: string;
}

export interface DevicePostureMatch {
  platform?: 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'chromeos';
}

export interface DevicePostureRule {
  id: string;
  name: string;
  description?: string;
  type: string;
  schedule?: string;
  expiration?: string;
  match?: DevicePostureMatch[];
  input?: any;
}

export interface FirewallAppType {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  application_type_id?: number;
}

export interface FirewallContentCategory {
  id: number;
  name: string;
  description: string;
  class: string;
  subcategories?: FirewallContentCategory[];
  beta?: boolean;
  deprecated?: boolean;
}

export interface FirewallPolicy {
  id: string;
  name: string;
  description?: string;
  action: string;
  type: 'NETWORK' | 'DNS' | 'HTTP';
  precedence: number;
  enabled: boolean;
  traffic: string;
  identity?: string; // New field
  rule_settings?: FirewallRuleSettings;
  filters?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface FirewallRuleSettings {
  dns_resolvers?: string[];
  check_subdomains?: boolean;
  add_headers?: Record<string, string>;
  remove_headers?: string[];
  biso_admin_controls?: {
    dcv?: boolean;
    disable_copy_paste?: boolean;
    disable_download?: boolean;
    disable_keyboard?: boolean;
    disable_printing?: boolean;
    disable_upload?: boolean;
  };
  l4_filters?: string[];
  override_host?: string;
  override_ips?: string[];
  block_page_enabled?: boolean; // New field
  block_page?: {
    // New field
    target_uri?: string;
    include_context?: boolean;
  };
  notification_settings?: {
    // New field
    enabled?: boolean;
    msg?: string;
  };
}

export interface FirewallRuleCondition {
  field: string;
  operator: string;
  value: any;
  logic?: 'and' | 'or';
}

export interface IngressRule {
  hostname?: string;
  service: string;
  path?: string;
  originRequest?: {
    noTLSVerify?: boolean;
    connectTimeout?: number;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export interface MemoryStats {
  total: number;
  used: number;
  free: number;
  usagePercent: number;
}

export interface NetworkStats {
  upload: string;
  download: string;
  uploadBps: number;
  downloadBps: number;
  interfaceName: string;
  interfaceAddress: {
    ipv4: string;
    ipv6: string | null;
  };
}

export interface RequestResponse<T> {
  result?: T | null;
  success: boolean;
  message?: string;
  result_info?: {
    page: number;
    per_page: number;
    total_pages: number;
    total_count: number;
    count: number;
  };
}

export interface ReusableList {
  id: string;
  name: string;
  description?: string;
  type: 'IP' | 'DOMAIN' | 'EMAIL' | 'URL' | 'SERIAL' | 'DEVICE';
  items?: ReusableListEntry[];
  created_at: string;
  updated_at: string;
  count?: number;
}

export interface ReusableListEntry {
  value: string;
  description?: string;
  created_at: string;
}

export interface SetupAdminData {
  email: string;
  name: string;
  password?: string;
}

export interface SetupStatus {
  setupComplete: boolean;
}

export interface SmtpConfigData {
  host: string;
  port: number;
  username: string;
  password?: string;
  encryption: string;
}

export interface SystemStats {
  cpu: CpuStats;
  memory: MemoryStats;
  network: NetworkStats;
  platform: string;
  uptime: number;
}

export interface Tunnel {
  id: string;
  cfTunnelId: string;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  applicationCount?: number;
  routes?: string[];
  conns_active_at?: string | null;
  conns_inactive_at?: string | null;
  createdAt?: string;
  token?: string;
}

export interface TunnelDetail extends Omit<Tunnel, 'routes'> {
  cfOverview: any;
  routes: {
    id: string;
    network: string;
    tunnel_id: string;
    created_at: string;
  }[];
  config: {
    ingress: IngressRule[];
    'warp-routing'?: { enabled: boolean };
  };
}

export interface TunnelStatus {
  id: string;
  cfTunnelId: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  connections: any[];
}

export interface UpdateUserData extends Partial<CreateUserData> {
  currentPassword?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  cloudflareId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WeatherStats {
  temperature: number;
  feelsLike: number;
  humidity: number;
  uvIndex: number;
  windSpeed: number;
  weatherCode: number;
  city: string;
  lat: number;
  lon: number;
  error?: string;
  message?: string;
}
