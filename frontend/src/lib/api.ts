import axios from 'axios';
import { User, Application, DashboardSummary, SystemStats, WeatherStats, Tunnel, TunnelDetail, Device, FirewallPolicy, SetupStatus, ServerProfile, SetupAdminData, CloudflareConfigData, SmtpConfigData, CreateApplicationData, CreateUserData, UpdateUserData, IngressRule, AuthResponse, RequestResponse, AccessApp, DevicePostureRule, FirewallContentCategory, ReusableList, DiskStats, SetupVerificationResult } from './types';


const api = axios.create({
  // baseURL is not set here to prevent build-time baking!
  // It will be resolve at runtime via ensureConfig discovery.
  headers: { 'Content-Type': 'application/json' }
});

// Dedicated axios instance for fetching runtime configuration
// This instance MUST use relative paths to avoid circular or incorrect URL resolution
const configLoader = axios.create();

// Dynamic configuration initialization
let isConfigured = false;
async function ensureConfig() {
  if (isConfigured || typeof window === 'undefined') return;

  try {
    // Discovery step: Fetch backend URL from our own frontend server
    // Always use a relative path here so it hits the same origin/port
    const response = await configLoader.get('/api/config');
    if (response.data?.apiUrl) {
      console.log(`[Runtime Config] Discovered backend at: ${response.data.apiUrl}`);
      api.defaults.baseURL = response.data.apiUrl;
      isConfigured = true;
    }
  } catch (err) {
    console.error('Frontend discovery failed. Backend communication may be unavailable:', err);
  }
}

// Attach JWT token and ensure config is loaded
if (typeof window !== 'undefined') {
  api.interceptors.request.use(async (config) => {
    await ensureConfig();

    // Explicitly apply the discovered baseURL to this request
    if (api.defaults.baseURL) {
      config.baseURL = api.defaults.baseURL;
    }

    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (res) => {
      // If the response follows the RequestResponse format
      if (res.data && typeof res.data === 'object' && 'success' in res.data && 'result' in res.data) {
        // If it's a paginated response (contains result_info), return the whole object
        // so the UI can access both .result and .result_info
        if (res.data.result_info) {
          return res;
        }
        // Otherwise, for simple results, return the data for easier use
        return { ...res, data: res.data };
      }
      return res;
    },
    (err) => {
      // Handle the standardized error format from the Exception Filter
      if (err.response?.status === 401) {
        localStorage.removeItem('auth_token');
        window.location.href = '/';
      }
      // You could also log err.response.data.message here for debugging
      return Promise.reject(err);
    }
  );
}

export default api;

//#region Auth API requests
export const login = (email: string, password: string) => api.post<RequestResponse<AuthResponse>>('/api/v1/auth/login', { email, password });
export const setupAdmin = (data: SetupAdminData) => api.post<RequestResponse<AuthResponse>>('/api/v1/auth/setup', data);
export const getMe = () => api.get<RequestResponse<User>>('/api/v1/auth/me');
//#endregion

//#region Setup API requests
export const getSetupStatus = () => api.get<RequestResponse<SetupStatus>>('/api/v1/setup/status');
export const resetSetup = () => api.post<RequestResponse<void>>('/api/v1/setup/reset');
export const saveCloudflareConfig = (data: CloudflareConfigData) => api.post<void>('/api/v1/setup/cloudflare', data);
export const saveSmtpConfig = (data: SmtpConfigData) => api.post<void>('/api/v1/setup/smtp', data);
export const saveServerProfile = (data: Partial<ServerProfile>) => api.post<void>('/api/v1/setup/server', data);
export const verifySetup = () => api.post<RequestResponse<SetupVerificationResult>>('/api/v1/setup/verify');
export const getCloudflareConfig = () => api.get<RequestResponse<CloudflareConfigData>>('/api/v1/setup/cloudflare');
export const getSmtpConfig = () => api.get<RequestResponse<SmtpConfigData>>('/api/v1/setup/smtp');
export const getServerProfile = () => api.get<RequestResponse<ServerProfile>>('/api/v1/setup/server');
export const uploadLogo = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<RequestResponse<{ url: string }>>('/api/v1/setup/upload-logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const completeSetup = () => api.post<RequestResponse<void>>('/api/v1/setup/complete');
//#endregion

//#region Dashboard API requests
export const getDashboard = () => api.get<RequestResponse<DashboardSummary>>('/api/v1/dashboard');
export const getSystemStats = () => api.get<RequestResponse<SystemStats>>('/api/v1/dashboard/system');
export const getStorageStats = () => api.get<RequestResponse<DiskStats[]>>('/api/v1/dashboard/storage');
export const getWeather = (lat?: number, lon?: number) => {
  const query = lat !== undefined && lon !== undefined ? `?lat=${lat}&lon=${lon}` : '';
  return api.get<RequestResponse<WeatherStats>>(`/api/v1/dashboard/weather${query}`);
};
//#endregion

//#region Local Applications API requests
export const getApplications = (page?: number, per_page?: number) => api.get<RequestResponse<Application[]>>('/api/v1/applications', { params: { page, per_page } });
export const getApplication = (id: string) => api.get<RequestResponse<Application>>(`/api/v1/applications/${id}`);
export const createApplication = (data: CreateApplicationData) => api.post<RequestResponse<Application>>('/api/v1/applications', data);
export const updateApplication = (id: string, data: Partial<CreateApplicationData>) => api.put<RequestResponse<Application>>(`/api/v1/applications/${id}`, data);
export const deleteApplication = (id: string) => api.delete<void>(`/api/v1/applications/${id}`);
//#endregion

//#region Tunnel API requests
export const getTunnels = (page?: number, per_page?: number) => api.get<RequestResponse<Tunnel[]>>('/api/v1/tunnels', { params: { page, per_page } });
export const createTunnel = (name: string) => api.post<RequestResponse<Tunnel>>('/api/v1/tunnels', { name });
export const updateTunnel = (id: string, name: string) => api.post<RequestResponse<Tunnel>>(`/api/v1/tunnels/${id}`, { name });
export const getTunnelStatus = (id: string) => api.get<RequestResponse<{ status: string }>>(`/api/v1/tunnels/${id}/status`);
export const getTunnelToken = (id: string) => api.get<RequestResponse<{ token: string }>>(`/api/v1/tunnels/${id}/token`);
export const getTunnelDetail = (id: string) => api.get<RequestResponse<TunnelDetail>>(`/api/v1/tunnels/${id}/detail`);
export const getTunnel = (id: string) => api.get<RequestResponse<Tunnel>>(`/api/v1/tunnels/${id}`);
export const manageTunnelRoutes = (id: string, action: 'ADD' | 'DELETE', cidr?: string, routeId?: string) => api.post<void>(`/api/v1/tunnels/${id}/routes`, { action, cidr, routeId });
export const manageTunnelConfig = (id: string, ingressRules: IngressRule[]) => api.post<void>(`/api/v1/tunnels/${id}/config`, { ingressRules });
export const deleteTunnel = (id: string) => api.delete<void>(`/api/v1/tunnels/${id}`);
//#endregion

//#region Users API request
export const getUsers = (page?: number, per_page?: number) => api.get<RequestResponse<User[]>>('/api/v1/users', { params: { page, per_page } });
export const createUser = (data: CreateUserData) => api.post<RequestResponse<User>>('/api/v1/users', data);
export const updateUser = (id: string, data: UpdateUserData) => api.put<RequestResponse<User>>(`/api/v1/users/${id}`, data);
export const deleteUser = (id: string) => api.delete<void>(`/api/v1/users/${id}`);
//#endregion

//#region Devices & Profiles API requests
export const getDevices = () => api.get<RequestResponse<Device[]>>('/api/v1/devices');
export const getDevicePostureRules = () => api.get<RequestResponse<DevicePostureRule[]>>('/api/v1/devices/posture');
/* export const getDeviceProfiles = () => api.get<RequestResponse<DeviceProfile[]>>('/api/v1/device_profiles');
export const createDeviceProfile = (name: string) => api.post<RequestResponse<DeviceProfile>>('/api/v1/device_profiles', { name });
export const setDeviceProfile = (deviceId: string, profileId: string) => api.post<void>(`/api/v1/devices/${deviceId}/profile`, { profileId }); */
//#endregion

//#region Firewall API Requests
export const getFirewallPolicies = () => api.get<RequestResponse<FirewallPolicy[]>>('/api/v1/firewall/policies');
export const getFirewallPolicy = (id: string) => api.get<RequestResponse<FirewallPolicy>>(`/api/v1/firewall/policies/${id}`);
export const createFirewallPolicy = (data: Partial<FirewallPolicy>) => api.post<RequestResponse<FirewallPolicy>>('/api/v1/firewall/policies', data);
export const deleteFirewallPolicy = (id: string) => api.delete<RequestResponse<null>>(`/api/v1/firewall/policies/${id}`);
export const getFirewallCategories = () => api.get<RequestResponse<FirewallContentCategory[]>>('/api/v1/firewall/policies/categories');
export const getFirewallAppTypes = () => api.get<RequestResponse<any>>('/api/v1/firewall/policies/app_types');
export const getGatewayUiOptions = () => api.get<RequestResponse<any>>('/api/v1/firewall/policies/ui_options');
export const getDlpFileTypes = () => api.get<RequestResponse<any>>('/api/v1/firewall/policies/dlp/file_types');
//#endregion

//#region Zero Trust Gateway Lists API requests
export const getGatewayLists = () => api.get<RequestResponse<ReusableList[]>>('/api/v1/lists');
export const createGatewayList = (data: any) => api.post<RequestResponse<ReusableList>>('/api/v1/lists', data);
export const getGatewayList = (id: string) => api.get<RequestResponse<ReusableList>>(`/api/v1/lists/${id}`);
export const updateGatewayList = (id: string, data: any) => api.patch<RequestResponse<ReusableList>>(`/api/v1/lists/${id}`, data);
export const updateGatewayListDetails = (id: string, data: any) => api.post<RequestResponse<ReusableList>>(`/api/v1/lists/${id}`, data);
export const deleteGatewayList = (id: string) => api.delete<RequestResponse<null>>(`/api/v1/lists/${id}`);
//#endregion

//#region Policies API requests
export const getAccessPolicies = (page?: number, per_page?: number) => api.get<any>('/api/v1/policies', { params: { page, per_page } });
export const getAccessPolicy = (id: string) => api.get<any>(`/api/v1/policies/${id}`);
export const createAccessPolicy = (data: any) => api.post<RequestResponse<any>>('/api/v1/cloudflare/access/policies', data);
export const deleteAccessPolicy = (id: string) => api.delete<any>(`/api/v1/policies/${id}`);
export const getAppsUsingPolicy = (id:string) => api.get<RequestResponse<AccessApp[]>>(`/api/v1/policies/${id}/apps`);
//#endregion

//#region Access Apps API requests
export const getAccessApps = () => api.get<RequestResponse<any>>('/api/v1/cloudflare/access/apps');
export const createCfAccessApp = (data: any) => api.post<void>('/api/v1/cloudflare/access/apps', data);
//#endregion

//#region Cloudflare API requests
export const getDomains = () => api.get<RequestResponse<any[]>>('/api/v1/domains');
export const getCfAccessGroups = () => api.get<RequestResponse<any[]>>('/api/v1/cloudflare/access/groups');
export const createDns = (zoneId: string, data: any) => api.post<void>('/api/v1/dns', { zoneId, data });
export const importCloudflareData = () => api.post<{ result: { users: any; applications: any }; logs: string[]; success: boolean }>('/api/v1/cloudflare/import');
//#endregion
