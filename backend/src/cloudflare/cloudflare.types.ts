export interface CloudflareDevicePostureMatch {
  platform?: 'windows' | 'mac' | 'linux' | 'android' | 'ios' | 'chromeos';
}

export interface CloudflareDevicePostureRule {
  id: string;
  name: string;
  description?: string;
  type: string;
  schedule?: string;
  expiration?: string;
  match?: CloudflareDevicePostureMatch[];
  input?: any;
}

export interface CloudflareAccessApplication {
  id?: string;
  type: 'self_hosted' | 'saas' | 'ssh' | 'vnc' | 'app_launcher' | 'warp' | 'biso' | 'bookmark' | 'dash_sso' | 'infrastructure' | 'rdp' | 'mcp' | 'mcp_portal' | 'proxy_endpoint';
  allow_authenticate_via_warp?: boolean;
  allow_iframe?: boolean;
  allowed_idps?: string[];
  app_launcher_visible?: boolean;
  aud?: string;
  auto_redirect_to_identity?: boolean;
  cors_headers?: {
    allow_all_headers?: boolean;
    allow_all_methods?: boolean;
    allow_all_origins?: boolean;
    allow_credentials?: boolean;
    allowed_headers?: string[];
    allowed_methods?: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS' | 'HEAD' | 'TRACE' | 'CONNECT' | 'PATCH')[];
    allowed_origins?: string[];
    max_age?: number;
  };
  created_at?: string;
  custom_deny_message?: string;
  custom_deny_url?: string;
  custom_non_identity_deny_url?: string;
  custom_pages?: string[];
  destinations?: (CloudflareAppPublicDestination | CloudflareAppPrivateDestination | CloudflareAppMCPServer)[];
  domain?: string;
  enable_binding_cookie?: boolean;
  http_only_cookie_attribute?: boolean;
  logo_url?: string;
  mfa_config?: CloudflareMFAConfig;
  name: string;
  oauth_configuration?: {
    dynamic_client_registration?: {
      allow_any_on_localhost?: boolean;
      allow_any_on_loopback?: boolean;
      allowed_uris?: string[];
    };
    enabled?: boolean;
    grant?: {
      access_token_lifetime?: string;
      session_duration?: string;
    };
  };
  options_preflight_bypass?: boolean;
  path_cookie_attribute?: boolean;
  policies?: CloudflareAccessPolicy[] | CloudflareAccessPolicyID[];
  read_service_tokens_from_header?: string;
  same_site_cookie_attribute?: string;
  scim_config?: CloudflareSCIMConfig;
  self_hosted_domains?: string[];
  service_auth_401_redirect?: boolean;
  session_duration?: string;
  skip_interstitial?: boolean;
  tags?: string[];
  target_criteria?: {
    port: number;
    protocol: 'RDP';
    target_attributes: string[];
  };
  uid?: string;
  updated_at?: string;
  use_clientless_isolation_app_launcher_url?: boolean;
}

export interface CloudflareAccessCondition {
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

export interface CloudflareAccessPolicy {
  id: string;
  app_count?: number;
  account_id: string;
  name: string;
  approval_groups?: {
    approvals_needed?: number;
    email_addresses?: string[];
    email_list_uuid?: string;
  }[];
  approval_required?: boolean;
  connection_rules?: {
    rdp?: {
      allowed_clipboard_local_to_remote_formats?: string[];
      allowed_clipboard_remote_to_local_formats?: string[];
    };
  };
  created_at?: string;
  decision: string;
  include: CloudflareAccessCondition[];
  exclude?: CloudflareAccessCondition[];
  require?: CloudflareAccessCondition[];
  isolation_required?: boolean;
  mfa_config?: CloudflareMFAConfig;
  purpose_justification_prompt?: string;
  purpose_justification_required?: boolean;
  reusable?: boolean;
  session_duration?: string;
  updated_at?: string;
}

export interface CloudflareAccessPolicyID {
  id: string;
}

export interface CloudflareAccountRole {
  id: string;
  name: string;
  permissions: {
    [key: string]: {
      read: boolean;
      edit: boolean;
    };
  };
}

export interface CloudflareAppMCPServer {
  mcp_server_id?: string;
  type: 'via_mcp_server_portal';
}

export interface CloudflareAppPrivateDestination {
  type: 'private';
  cidr?: string;
  hostname?: string;
  l4_protocol?: 'tcp' | 'udp';
  port?: string;
  vnet_id?: string;
  port_range?: string;
  uri?: string;
}

export interface CloudflareAppPublicDestination {
  type: 'public';
  uri?: string;
}

export interface CloudflareContentCategory {
  id: number;
  name: string;
  description: string;
  class: string;
  subcategories?: CloudflareContentCategory[];
  beta?: boolean;
  deprecated?: boolean;
}

export interface CloudflareDevice {
  id: string;
  active_registrations: number;
  created_at: string;
  last_seen_at: string;
  name: string;
  updated_at: string;
  client_version?: string;
  deleted_at?: string | null;
  device_type?: string;
  hardware_id?: string;
  last_seen_registration?: {
    policy?: {
      id: string;
      default: boolean;
      deleted: boolean;
      name: string;
      updated_at: string;
    };
  };
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
  serial_number?: string;
  public_ip?: string;
}

export interface CloudflareDNSLog {
  query: string;
  query_type: string;
  policy_uuid: string;
  location_uuid: string;
  source_ip: string;
  destination_ip: string;
  destination_port: number;
  protocol: string;
  datetime: number;
  decision: string;
  blocked: boolean;
  overridden: boolean;
  query_category_ids: number[];
  initial_category_ids: number[];
  cname_category_ids?: number[];
  rdata: any[];
  email: string;
  user_id: string;
  device_id: string;
  dnssec_validation_disabled: boolean;
  ede_errors: any[];
  src_country: string;
  tenant_configuration_account_id: string;
  host_application_id: number | null;
  rcode: number;
  time_zone_inferred_method: string;
  custom_resolver_address: string;
  custom_resolver_response: string;
  custom_resolver_time_in_ms: number;
  custom_resolver_rule_uuid: string;
  is_response_cached: boolean;
  colo_id: number;
  metal_id: number;
  resolved_ips: string[];
  authoritative_nameserver_ips: string[];
  doh_subdomain: string;
  dot_subdomain: string | null;
  resolved_country_codes: string[];
  resolved_continent_codes: string[];
  src_country_code: string;
  src_continent_code: string;
  cnames: string[];
  query_id: string;
  resolver_rule_id?: string;
  internal_dns_rcode: number;
  internal_dns_time_in_ms: number;
  redirect_target_uri: string;
  registration_id: string;
  query_application_ids?: number[];
  matched_tunnel_type: number;
  response_time_ms: number;
}

export interface CloudflareDNSRecord {
  id: string;
  name: string;
  type: string;
  content?: string;
  proxiable?: boolean;
  proxied?: boolean;
  ttl: number;
  settings: {
    flatten_cname?: boolean;
    ipv4_only?: boolean;
    ipv6_only?: boolean;
  };
  meta?: any;
  comment?: string;
  tags: string[];
  created_on: string;
  modified_on: string;
  comment_modified_on?: string;
}

export interface CloudflareError {
  code: number;
  message: string;
}

export interface CloudflareHTTPLog {
  session_id: string;
  datetime: number;
  request_id: string;
  account_id: string;
  user_id: string;
  email: string;
  device_id: string;
  rule_id: string;
  action: number;
  action_name: string;
  is_isolated: boolean;
  http_host: string;
  http_method: number;
  http_method_name: string;
  http_version: number;
  http_version_name: string;
  http_status_code: number;
  url: string;
  referer: string;
  user_agent: string;
  source_ip: string;
  source_internal_ip: string;
  source_port: number;
  destination_ip: string;
  destination_port: number;
  uploaded_file_names: string[];
  downloaded_file_names: string[];
  upload_matched_dlp_profiles: string[];
  download_matched_dlp_profiles: string[];
  upload_matched_dlp_profileEntries: string[];
  download_matched_dlp_profileEntries: string[];
  dlp_match_context: string;
  dlp_match_context_parsed: string | null;
  file_info: {
    f: string[];
  };
  blocked_file_name: string;
  blocked_file_type: string;
  blocked_file_hash: string;
  blocked_file_size: number;
  blocked_file_reason: number;
  added_headers: string[];
  last_authenticated_at: number;
  request_antivirus_scanned: boolean;
  response_antivirus_scanned: boolean;
  quarantined: boolean;
  src_country: string;
  dst_country: string;
  src_continent: string;
  dst_continent: string;
  proxy_endpoint: string;
  untrusted_cert_action: string;
  access_app_aud: string;
  colo_id: number;
  metal_id: number;
  application_ids: number[];
  application_type_ids: number[];
  category_ids: number[];
  virtual_network_id: string;
  forensic_copy_status: string;
  redirect_target_uri: string;
  registration_id: string;
  gen_ai_prompt_request: string;
  gen_ai_prompt_response: string;
  gen_ai_conversation: string;
  application_statuses: any[];
  app_control_info: any | null;
  upload_matched_dlp_data_classes: string[];
  download_matched_dlp_data_classes: string[];
  upload_matched_dlp_data_tags: string[];
  download_matched_dlp_data_tags: string[];
  upload_matched_dlp_sensitivity_levels: string[];
  download_matched_dlp_sensitivity_levels: string[];
}

export interface CloudflareIngressRule {
  hostname?: string;
  service: string;
  originRequest?: CloudflareOriginRequest;
  path?: string;
}

export interface CloudflareMember {
  id: string;
  email?: string;
  roles: { id: string; name: string }[];
  status: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    name?: string;
  };
}

export interface CloudflareMFAConfig {
  allowed_authenticators: 'totp' | 'biometrics' | 'security_key';
  mfa_disabled?: boolean;
  session_duration?: string;
}

export interface CloudflareNetworkLog {
  session_id: string;
  datetime: number;
  account_id: string;
  user_id: string;
  device_id: string;
  virtual_network_id: string;
  rule_id: string;
  action: number;
  action_name: string;
  source_ip: string;
  source_internal_ip: string;
  source_port: number;
  destination_ip: string;
  destination_port: number;
  override_ip: string;
  override_port: number;
  transport: string;
  email: string;
  sni: string;
  last_authenticated_at: number;
  src_country: string;
  dst_country: string;
  src_continent: string;
  dst_continent: string;
  proxy_endpoint: string;
  detected_protocol: string;
  access_app_auds: any[];
  colo_id: number;
  metal_id: number;
  application_ids: any[];
  category_ids: number[];
  redirect_target_uri: string;
  registration_id: string;
}

export interface CloudflareNetworkRoute {
  id: string;
  comment?: string;
  created_at: string;
  deleted_at?: string | null;
  network?: string;
  tun_type?: 'cfd_tunner' | 'warp' | 'warp_connector' | 'magic' | 'ip_sec' | 'gre' | 'cni';
  tunnel_id: string;
  tunnel_name?: string;
  virtual_network_id?: string;
  virtual_network_name?: string;
}

export interface CloudflareOriginRequest {
  access?: {
    audTag: string[];
    teamName: string;
    required?: boolean;
  };
  caPool?: string;
  connectTimeout?: number;
  disableChunkedEncoding?: boolean;
  http2Origin?: boolean;
  httpHostHeader?: string;
  keepAliveConnections?: number;
  keepAliveTimeout?: number;
  matchSNItoHost?: boolean;
  noHappyEyeballs?: boolean;
  noTLSVerify?: boolean;
  originServerName?: string;
  proxyType?: string;
  tcpKeepAlive?: number;
  tlsTimeout?: number;
}

export interface CloudflareResponse<T> {
  result: T;
  success: boolean;
  errors: CloudflareError[];
  messages: string[];
  result_info?: CloudflareResponseResultInfo;
}

export interface CloudflareResponseResultInfo {
  page: number;
  per_page: number;
  total_pages: number;
  total_count: number;
  count: number;
}

export interface CloudflareSCIMConfig {
  idp_uid: string;
  remote_uri: string;
  authentication: any;
  deactivate_on_delete?: boolean;
  enable?: boolean;
  mappings: any;
}

export interface CloudflareTrafficLog<T> {
  time: number;
  logs: T[];
}

export interface CloudflareTunnel {
  id: string;
  account_tag: string;
  created_at: string;
  deleted_at: string | null;
  name: string;
  connections: CloudflareTunnelConnection[];
  conns_active_at: string;
  conns_inactive_at: string | null;
  tun_type: string;
  metadata: Record<string, unknown>;
  status: string;
  remote_config: boolean;
  config_src: string;
}

export interface CloudflareTunnelConfig {
  account_id: string;
  config: {
    ingress: CloudflareIngressRule[];
    originRequest?: CloudflareOriginRequest;
  };
  created_at: string;
  source: string;
  tunnel_id: string;
  version: number;
}

export interface CloudflareTunnelConnection {
  id: string;
  client_id: string;
  client_version: string;
  colo_name: string;
  uuid: string;
  is_pending_reconnect: boolean;
  origin_ip: string;
  opened_at: string;
}

export interface CloudflareTunnelConnectionDetail {
  id: string;
  arch: string;
  config_version: string;
  conns: CloudflareTunnelConnection[];
  features: string[];
  run_at: string;
  version: string;
}

export interface CloudflareTunnelWithToken extends CloudflareTunnel {
  token: string;
}

export interface CloudflareZone {
  id: string;
  account: {
    id: string;
    name: string;
  };
  activated_on: string;
  created_on: string;
  development_mode: number;
  meta: {
    cdn_only: boolean;
    custom_certificate_quota: number;
    dns_only: boolean;
    foundation_dns: boolean;
    page_rule_quota: number;
    phishing_detected: boolean;
    step: number;
  };
  modified_on: string;
  name: string;
  name_servers: string[];
  original_dnshost: string;
  original_name_servers: string[];
  original_registrar: string;
  owner: {
    id: string;
    name: string;
    type: string;
  };
  plan: {
    id: string;
    can_subscribe: boolean;
    currency: string;
    externally_managed: boolean;
    frequency: string;
    is_subscribed: boolean;
    legacy_discount: boolean;
    legacy_id: string;
    name: string;
    price: number;
  };
  cname_suffix: string;
  paused: boolean;
  permissions: string[];
  status: string;
  tenant: {
    id: string;
    name: string;
  };
  tenant_unit: {
    id: string;
  };
  type: string;
  vanity_name_servers: string[];
  verification_key: string;
}

export interface CloudflareGatewayRule {
  id?: string;
  name: string;
  description?: string;
  action: string;
  enabled: boolean;
  precedence?: number;
  filters?: string[];
  traffic: string;
  identity?: string;
  rule_settings?: {
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
    block_page_enabled?: boolean;
    block_page?: {
      target_uri?: string;
      include_context?: boolean;
    };
    notification_settings?: {
      enabled?: boolean;
      msg?: string;
    };
  };
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface CloudflareVerificationResult {
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
}
