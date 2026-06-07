/**
 * Shared data models and interfaces for Zephra CloudGate
 */

export type UserRole = 'ADMIN' | 'MEMBER' | 'GUEST';

export enum ApplicationExposureTypeEnum {
  PUBLIC = 'PUBLIC',
  PUBLIC_WITH_ACCESS = 'PUBLIC_WITH_ACCESS',
  WARP = 'WARP'
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface DashboardSummary {
  applications: number;
  tunnels: number;
  users: number;
  devices: number;
}

export interface CpuStats {
  usage: number;
  cores: number;
  model: string;
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
}

export interface SystemStats {
  cpu: CpuStats;
  memory: MemoryStats;
  network: NetworkStats;
  platform: string;
  uptime: number;
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

export interface ApplicationPolicy {
  type: 'OPEN' | 'RESTRICTED';
  restrictedType?: 'USERS' | 'GROUP';
  users?: string[];
  groupId?: string;
}

export interface CreateApplicationData {
  name: string;
  logoUrl?: string;
  publicUrl?: string;
  destinationType: 'URI' | 'IP';
  destinationUrl: string;
  exposureType: ApplicationExposureTypeEnum;
  tunnelId?: string;
  policy?: ApplicationPolicy;
}

export interface Application extends CreateApplicationData {
  id: string;
  createdAt: string;
  updatedAt: string;
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

export interface IngressRule {
  hostname?: string;
  service: string;
  path?: string;
  originRequest?: {
    noTLSVerify?: boolean;
    connectTimeout?: number;
  };
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

export interface Device {
  id: string;
  name: string;
  model: string;
  platform: string;
  last_seen: string;
  status: string;
  type?: string;
  hostname?: string;
  os_distro_name?: string;
  os_distro_revision?: string;
  version?: string;
}

export interface SetupStatus {
  setupComplete: boolean;
}

export interface Profile {
  name: string;
  logoUrl?: string;
  website?: string;
  description?: string;
}

export interface SetupAdminData {
  email: string;
  name: string;
  password?: string;
}

export interface CloudflareConfigData {
  accountId: string;
  email: string;
  teamName?: string;
  globalApiKey?: string;
  apiToken?: string;
}

export interface SmtpConfigData {
  host: string;
  port: number;
  username: string;
  password?: string;
  encryption: string;
}

export interface CreateUserData {
  email: string;
  name: string;
  role: UserRole;
  password?: string;
}

export interface UpdateUserData extends Partial<CreateUserData> {
  currentPassword?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface FirewallPolicy {
  id: string;
  name: string;
  description?: string;
  action: 'ALLOW' | 'BLOCK' | 'ISOLATE' | 'MOCK' | 'LOG' | 'SKIP' | string;
  type: 'NETWORK' | 'DNS' | 'HTTP' | string;
  precedence: number;
  enabled: boolean;
  filters: string[];
  rules?: any[];
}

export interface Domain{
  id: string;
  name: string;
  status: string;
}

export interface RequestResponse {
  result: {};
  success: boolean;
  result_info?:{
    page: number;
    per_page: number;
    total_pages: number;
    total_count: number;
    count: number;
  }
}