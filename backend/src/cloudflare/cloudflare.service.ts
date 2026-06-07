import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { decrypt } from '../utils/crypto.util';
import axios, { AxiosError, AxiosResponse } from 'axios';

import { CloudflareTunnelConfig, CloudflareAccessApplication, CloudflareMember, CloudflareResponse, CloudflareNetworkRoute, CloudflareAccountRole, CloudflareZone, CloudflareResponseResultInfo, CloudflareTunnelWithToken, CloudflareTunnel, CloudflareDevice, CloudflareTunnelConnectionDetail, CloudflareDNSRecord, CloudflareAccessPolicy, CloudflareContentCategory, CloudflareDevicePostureRule, CloudflareGatewayRule, CloudflareVerificationResult, CloudflareTrafficLog, CloudflareHTTPLog, CloudflareDNSLog, CloudflareNetworkLog, CloudflareIngressRule } from './cloudflare.types';
import { ApplicationExposureTypeEnum, FirewallAppType, ReusableList } from 'src/shared/types';

const CONFIG_KEYS = {
  CF_ACCOUNT_ID: 'cf_account_id',
  CF_EMAIL: 'cf_email',
  CF_GLOBAL_API_KEY: 'cf_global_api_key',
  CF_API_TOKEN: 'cf_api_token'
} as const;

type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

@Injectable()
export class CloudflareService {
  private readonly BASE_URL = 'https://api.cloudflare.com/client/v4';
  private legacyConfigChecked = false;

  constructor(private prisma: PrismaService) {}

  //#region API Initiator and interceptor

  private async getClient() {
    const config = await this.getConfigEntries([CONFIG_KEYS.CF_ACCOUNT_ID, CONFIG_KEYS.CF_GLOBAL_API_KEY, CONFIG_KEYS.CF_EMAIL]);

    const accountId = config[CONFIG_KEYS.CF_ACCOUNT_ID] || '';
    //const token = config[CONFIG_KEYS.CF_API_TOKEN] ? decrypt(config[CONFIG_KEYS.CF_API_TOKEN] || '') : '';
    const apiKey = config[CONFIG_KEYS.CF_GLOBAL_API_KEY] ? decrypt(config[CONFIG_KEYS.CF_GLOBAL_API_KEY] || '') : '';
    const email = config[CONFIG_KEYS.CF_EMAIL] || '';

    if (!accountId) {
      throw new Error('Cloudflare account is not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (apiKey && email) {
      headers['X-Auth-Key'] = apiKey;
      headers['X-Auth-Email'] = email;
    } else {
      throw new Error('No valid Cloudflare credentials found');
    }

    return { accountId, headers };
  }

  private async getConfigEntries(keys: ConfigKey[]): Promise<Record<string, string | undefined>> {
    await this.ensureLegacyConfigMigrated();

    const rows = await this.prisma.configuration.findMany({
      where: { name: { in: keys as string[] } },
      orderBy: { id: 'asc' }
    });

    const map: Record<string, string | undefined> = {};
    for (const key of keys) {
      map[key] = undefined;
    }

    for (const row of rows) {
      if (map[row.name] === undefined) {
        map[row.name] = row.value;
      }
    }

    return map;
  }

  private async setConfigValue(name: ConfigKey, value: string): Promise<void> {
    const existing = await this.prisma.configuration.findMany({
      where: { name },
      select: { id: true },
      orderBy: { id: 'asc' }
    });

    if (existing.length === 0) {
      await this.prisma.configuration.create({ data: { name, value } });
      return;
    }

    await this.prisma.configuration.update({
      where: { id: existing[0].id },
      data: { value }
    });

    if (existing.length > 1) {
      await this.prisma.configuration.deleteMany({
        where: { id: { in: existing.slice(1).map((item) => item.id) } }
      });
    }
  }

  private async ensureLegacyConfigMigrated(): Promise<void> {
    if (this.legacyConfigChecked) return;
    this.legacyConfigChecked = true;

    const trackedKeys = Object.values(CONFIG_KEYS) as string[];
    const hasStoredConfig = await this.prisma.configuration.count({
      where: { name: { in: trackedKeys } }
    });
    if (hasStoredConfig > 0) return;

    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.join(process.cwd(), 'config.json');
    if (!fs.existsSync(configPath)) return;

    const legacyConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as {
      cf_account_id?: string;
      cf_email?: string;
      cf_global_api_key?: string;
      cf_api_token?: string;
    };

    if (legacyConfig.cf_account_id) await this.setConfigValue(CONFIG_KEYS.CF_ACCOUNT_ID, legacyConfig.cf_account_id);
    if (legacyConfig.cf_email) await this.setConfigValue(CONFIG_KEYS.CF_EMAIL, legacyConfig.cf_email);
    if (legacyConfig.cf_global_api_key) await this.setConfigValue(CONFIG_KEYS.CF_GLOBAL_API_KEY, legacyConfig.cf_global_api_key);
    if (legacyConfig.cf_api_token) await this.setConfigValue(CONFIG_KEYS.CF_API_TOKEN, legacyConfig.cf_api_token);
  }

  private async apiRequest<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, data?: any, params?: any): Promise<CloudflareResponse<T>> {
    const { headers } = await this.getClient();
    const url = `${this.BASE_URL}${path}`;

    try {
      const response: AxiosResponse<any> = await axios({ method, url, data, params, headers });

      const cfData = response.data;
      return {
        result: cfData.result as T,
        success: cfData.success,
        errors: cfData.errors || [],
        messages: cfData.messages || [],
        result_info: cfData.result_info
      };
    } catch (error: any) {
      const errorData = error.response?.data || {};
      throw new Error(errorData.errors?.[0]?.message || error.message || 'Cloudflare API Request Failed');
    }
  }

  //#endregion

  //#region Member API Requests

  async getAccountMembers(page?: number, per_page?: number): Promise<CloudflareResponse<CloudflareMember[]>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareMember[]>('GET', `/accounts/${accountId}/members`, null, { page: page || 1, per_page: per_page || 5000 });
  }

  async addAccountMember(name: string, email: string, roles: string[]): Promise<CloudflareResponse<CloudflareMember>> {
    const { accountId } = await this.getClient();
    return this.apiRequest('POST', `/accounts/${accountId}/members`, { email, roles });
  }

  async addAccountMemberByRole(name: string, email: string, roleName: 'ADMIN' | 'MEMBER') {
    const { accountId } = await this.getClient();
    try {
      const allRoles = await this.getAccountRoles();
      if (!allRoles) throw new Error('Could not fetch Cloudflare roles');

      const roleNamesToFind = roleName === 'ADMIN' ? ['Super Administrator - All Privileges'] : ['Minimal Account Access', 'Cloudflare Zero Trust Read Only'];

      const targetRoleIds = allRoles.filter((r: any) => roleNamesToFind.includes(r.name)).map((r: any) => r.id);

      if (targetRoleIds.length === 0) {
        throw new Error(`Could not find matching Cloudflare roles for ${roleName}`);
      }

      const res = await this.apiRequest<any>('POST', `/accounts/${accountId}/members`, { email, roles: targetRoleIds });
      return { ...res, id: res.result?.id };
    } catch (e: unknown) {
      this.handleError('addAccountMemberByRole', e as Error);
    }
  }

  async getAccountRoles(per_page?: number, pageNumber?: number): Promise<CloudflareAccountRole[] | undefined> {
    const { accountId } = await this.getClient();
    try {
      const rolesRes = await this.apiRequest<CloudflareAccountRole[]>('GET', `/accounts/${accountId}/roles`, null, { per_page: per_page || 5000, page: pageNumber || 1 });

      let roles = rolesRes.result || [];
      const info = rolesRes.result_info;

      if (!pageNumber && info && info.total_pages > 1) {
        for (let p = 2; p <= info.total_pages; p++) {
          const paginated = await this.apiRequest<CloudflareAccountRole[]>('GET', `/accounts/${accountId}/roles`, null, { per_page: 100, page: p });
          roles = roles.concat(paginated.result || []);
        }
      }
      return roles;
    } catch (e: unknown) {
      this.handleError('getAccountRoles', e as Error);
      return undefined;
    }
  }

  async deleteAccountMemberByEmail(email: string, cloudflareId?: string) {
    const { accountId } = await this.getClient();
    try {
      let memberId = cloudflareId;

      if (!memberId) {
        const membersRes = await this.getAccountMembers(1, 100);
        const member = membersRes.result?.find((m: CloudflareMember) => m.user.email === email || m.email === email);
        if (!member) {
          console.warn(`Member with email ${email} not found in Cloudflare`);
          return;
        }
        memberId = member.id;
      }

      return this.apiRequest('DELETE', `/accounts/${accountId}/members/${memberId}`);
    } catch (e: unknown) {
      this.handleError('deleteAccountMemberByEmail', e as Error);
    }
  }

  async updateAccountMemberRoleByEmail(email: string, roleName: 'ADMIN' | 'MEMBER', cloudflareId?: string) {
    const { accountId } = await this.getClient();
    try {
      let memberId = cloudflareId;

      if (!memberId) {
        const membersRes = await this.getAccountMembers(1, 100);
        const member = membersRes.result?.find((m: CloudflareMember) => m.user.email === email || m.email === email);
        if (!member) {
          console.warn(`Member with email ${email} not found in Cloudflare`);
          return;
        }
        memberId = member.id;
      }

      const allRoles = await this.getAccountRoles();
      if (!allRoles) throw new Error('Could not fetch Cloudflare roles');

      const roleNamesToFind = roleName === 'ADMIN' ? ['Super Administrator - All Privileges'] : ['Minimal Account Access', 'Cloudflare Zero Trust Read Only'];

      const targetRoleIds = allRoles.filter((r: any) => roleNamesToFind.includes(r.name)).map((r: any) => r.id);

      if (targetRoleIds.length === 0) {
        throw new Error(`Could not find matching Cloudflare roles for ${roleName}`);
      }

      return this.apiRequest('PUT', `/accounts/${accountId}/members/${memberId}`, { roles: targetRoleIds });
    } catch (e: unknown) {
      this.handleError('updateAccountMemberRoleByEmail', e as Error);
    }
  }

  //#endregion

  //#region Tunnel API Requests

  async getTunnels(page?: number, per_page?: number): Promise<CloudflareResponse<CloudflareTunnel[]>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareTunnel[]>('GET', `/accounts/${accountId}/cfd_tunnel`, null, { page: page || 1, per_page: per_page || 5000 });
  }

  async getTunnel(id: string): Promise<CloudflareResponse<CloudflareTunnel>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareTunnel>('GET', `/accounts/${accountId}/cfd_tunnel/${id}`);
  }

  async createTunnel(name: string): Promise<CloudflareTunnelWithToken | undefined> {
    const { accountId } = await this.getClient();
    try {
      const tunnelRes = await this.apiRequest<CloudflareTunnel>('POST', `/accounts/${accountId}/cfd_tunnel`, { name, config_src: 'cloudflare' });

      const tunnel = tunnelRes.result;
      if (!tunnel) throw new Error('Failed to create tunnel');

      const tokenRes = await this.apiRequest<string>('GET', `/accounts/${accountId}/cfd_tunnel/${tunnel.id}/token`);

      return { ...tunnel, token: tokenRes.result || '' };
    } catch (e: unknown) {
      this.handleError('createTunnel', e as Error);
    }
  }

  async updateTunnel(tunnelId: string, name: string): Promise<CloudflareResponse<CloudflareTunnel>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareTunnel>('PATCH', `/accounts/${accountId}/cfd_tunnel/${tunnelId}`, { name });
  }

  async deleteTunnel(tunnelId: string): Promise<CloudflareResponse<CloudflareTunnel>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareTunnel>('DELETE', `/accounts/${accountId}/cfd_tunnel/${tunnelId}`);
  }

  async getTunnelConnections(tunnelId: string): Promise<CloudflareResponse<CloudflareTunnelConnectionDetail[]>> {
    const { accountId } = await this.getClient();
    return this.apiRequest('GET', `/accounts/${accountId}/cfd_tunnel/${tunnelId}/connections`);
  }

  async getTunnelConfig(tunnelId: string): Promise<CloudflareResponse<CloudflareTunnelConfig>> {
    const { accountId } = await this.getClient();
    try {
      return await this.apiRequest<CloudflareTunnelConfig>('GET', `/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`);
    } catch (e: unknown) {
      console.warn(`Could not fetch config for tunnel ${tunnelId}:`, (e as Error).message);
      return {
        result: {} as CloudflareTunnelConfig,
        success: false,
        errors: [{ code: 0, message: (e as Error).message }],
        messages: []
      };
    }
  }

  async updateTunnelConfig(tunnelId: string, config: any): Promise<CloudflareResponse<CloudflareTunnelConfig>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareTunnelConfig>('PUT', `/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, { config });
  }

  async getTunnelToken(tunnelId: string): Promise<CloudflareResponse<string>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<string>('GET', `/accounts/${accountId}/cfd_tunnel/${tunnelId}/token`);
  }

  async getPrivateNetworks(): Promise<CloudflareResponse<CloudflareNetworkRoute[]>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareNetworkRoute[]>('GET', `/accounts/${accountId}/teamnet/routes`);
  }

  async createPrivateNetwork(cidr: string, tunnelId: string): Promise<CloudflareResponse<CloudflareNetworkRoute>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareNetworkRoute>('POST', `/accounts/${accountId}/teamnet/routes`, {
      network: cidr,
      tunnel_id: tunnelId
    });
  }

  async deletePrivateNetwork(routeId: string): Promise<CloudflareResponse<CloudflareNetworkRoute>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareNetworkRoute>('DELETE', `/accounts/${accountId}/teamnet/routes/${routeId}`);
  }

  //#endregion

  //#region Domain API Requests

  async getZones(): Promise<CloudflareResponse<CloudflareZone[]>> {
    try {
      const response = await this.apiRequest<CloudflareZone[]>('GET', '/zones', null, { per_page: 50 });
      let zones = response.result || [];
      const info = response.result_info;

      if (info && info.total_pages > 1) {
        for (let p = 2; p <= info.total_pages; p++) {
          const paginated = await this.apiRequest<CloudflareZone[]>('GET', '/zones', null, { per_page: 50, page: p });
          zones = zones.concat(paginated.result || []);
        }
      }

      return { ...response, result: zones };
    } catch (e: unknown) {
      this.handleError('getZones', e as Error);
      return {
        result: [],
        success: false,
        errors: [{ code: 500, message: (e as Error).message }],
        messages: []
      };
    }
  }

  async getDnsRecords(zoneId: string, name?: string): Promise<CloudflareResponse<CloudflareDNSRecord[]>> {
    const params: any = { per_page: 5000 };
    if (name) {
      params.name = name;
    }
    return this.apiRequest<CloudflareDNSRecord[]>('GET', `/zones/${zoneId}/dns_records`, null, params);
  }

  async createDnsRecord(zoneId: string, data: any): Promise<CloudflareResponse<CloudflareDNSRecord>> {
    return this.apiRequest<CloudflareDNSRecord>('POST', `/zones/${zoneId}/dns_records`, data);
  }

  async deleteDnsRecord(zoneId: string, recordId: string): Promise<CloudflareResponse<{ id: string }>> {
    return this.apiRequest('DELETE', `/zones/${zoneId}/dns_records/${recordId}`);
  }

  //#endregion

  //#region Application and Access API Requests

  async getApps(): Promise<CloudflareResponse<CloudflareAccessApplication[]>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareAccessApplication[]>('GET', `/accounts/${accountId}/access/apps`, null, { per_page: 100 });
  }

  async createAccessApp(data: CloudflareAccessApplication): Promise<CloudflareResponse<CloudflareAccessApplication>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareAccessApplication>('POST', `/accounts/${accountId}/access/apps`, data);
  }

  async updateAccessApp(appId: string, data: CloudflareAccessApplication): Promise<CloudflareResponse<CloudflareAccessApplication>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareAccessApplication>('PUT', `/accounts/${accountId}/access/apps/${appId}`, data);
  }

  async deleteAccessApp(appId: string): Promise<CloudflareResponse<null>> {
    const { accountId } = await this.getClient();
    return this.apiRequest('DELETE', `/accounts/${accountId}/access/apps/${appId}`);
  }

  async getAccessPolicies(page?: number, per_page?: number): Promise<CloudflareResponse<CloudflareAccessPolicy[]>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareAccessPolicy[]>('GET', `/accounts/${accountId}/access/policies`, null, { page: page || 1, per_page: per_page || 5000 });
  }

  async getAccessPolicy(policyId: string): Promise<CloudflareResponse<CloudflareAccessPolicy>> {
    const { accountId } = await this.getClient();
    let res = await this.apiRequest<CloudflareAccessPolicy>('GET', `/accounts/${accountId}/access/policies/${policyId}`);
    res.result = { ...res.result, account_id: accountId };
    return { ...res };
  }

  async createAccessPolicy(data: any): Promise<CloudflareResponse<CloudflareAccessPolicy>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareAccessPolicy>('POST', `/accounts/${accountId}/access/policies`, data);
  }

  async deleteAccessPolicy(policyId: string): Promise<CloudflareResponse<null>> {
    const { accountId } = await this.getClient();
    return this.apiRequest('DELETE', `/accounts/${accountId}/access/policies/${policyId}`);
  }

  async getAccessGroups(): Promise<CloudflareResponse<any[]>> {
    const { accountId } = await this.getClient();
    return this.apiRequest('GET', `/accounts/${accountId}/access/groups`);
  }

  //#endregion

  //#region Device API Requests
  async getDevices(): Promise<CloudflareResponse<CloudflareDevice[]>> {
    const { accountId } = await this.getClient();
    try {
      return await this.apiRequest<CloudflareDevice[]>('GET', `/accounts/${accountId}/devices`);
    } catch (e: unknown) {
      this.handleError('getDevices', e as Error);
      return {
        result: [],
        success: false,
        errors: [{ code: 500, message: (e as Error).message }],
        messages: [(e as Error).message || 'An error occurred while fetching devices']
      };
    }
  }

  async getDevicePostureRules(): Promise<CloudflareResponse<CloudflareDevicePostureRule[]>> {
    const { accountId } = await this.getClient();
    try {
      return await this.apiRequest<CloudflareDevicePostureRule[]>('GET', `/accounts/${accountId}/devices/posture`);
    } catch (e: unknown) {
      this.handleError('getDevicePostureRules', e as Error);
      return {
        result: [],
        success: false,
        errors: [{ code: 500, message: (e as Error).message }],
        messages: [(e as Error).message || 'An error occurred while fetching device posture rules']
      };
    }
  }

  //#endregion

  //#region Reuasable Lists API Requests

  async getGatewayLists(): Promise<CloudflareResponse<ReusableList[]>> {
    const { accountId } = await this.getClient();
    try {
      return await this.apiRequest<ReusableList[]>('GET', `/accounts/${accountId}/gateway/lists`);
    } catch (e: unknown) {
      this.handleError('getGatewayLists', e as Error);
      return {
        result: [],
        success: false,
        errors: [{ code: 500, message: (e as Error).message }],
        messages: [(e as Error).message || 'An error occurred while fetching gateway lists']
      };
    }
  }

  async getGatewayList(listId: string): Promise<CloudflareResponse<ReusableList>> {
    const { accountId } = await this.getClient();
    return this.apiRequest('GET', `/accounts/${accountId}/gateway/lists/${listId}`);
  }

  async createGatewayList(payload: any): Promise<CloudflareResponse<ReusableList>> {
    const { accountId } = await this.getClient();
    return this.apiRequest('POST', `/accounts/${accountId}/gateway/lists`, payload);
  }

  async updateGatewayList(listId: string, payload: any): Promise<CloudflareResponse<ReusableList>> {
    const { accountId } = await this.getClient();
    return this.apiRequest('PATCH', `/accounts/${accountId}/gateway/lists/${listId}`, payload);
  }

  async updateGatewayListDetails(listId: string, payload: any): Promise<CloudflareResponse<ReusableList>> {
    const { accountId } = await this.getClient();
    return this.apiRequest('PUT', `/accounts/${accountId}/gateway/lists/${listId}`, payload);
  }

  async deleteGatewayList(listId: string): Promise<CloudflareResponse<null>> {
    const { accountId } = await this.getClient();
    return this.apiRequest('DELETE', `/accounts/${accountId}/gateway/lists/${listId}`);
  }

  //#endregion

  //#region Firewall Rules API Requests

  async getGatewayRules(): Promise<CloudflareResponse<CloudflareGatewayRule[]>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareGatewayRule[]>('GET', `/accounts/${accountId}/gateway/rules`);
  }

  async getGatewayRule(ruleId: string): Promise<CloudflareResponse<CloudflareGatewayRule>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareGatewayRule>('GET', `/accounts/${accountId}/gateway/rules/${ruleId}`);
  }

  async createGatewayRule(payload: Partial<CloudflareGatewayRule>): Promise<CloudflareResponse<CloudflareGatewayRule>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareGatewayRule>('POST', `/accounts/${accountId}/gateway/rules`, payload);
  }

  async updateGatewayRule(ruleId: string, payload: Partial<CloudflareGatewayRule>): Promise<CloudflareResponse<CloudflareGatewayRule>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareGatewayRule>('PUT', `/accounts/${accountId}/gateway/rules/${ruleId}`, payload);
  }

  async deleteGatewayRule(ruleId: string): Promise<CloudflareResponse<{ id: string }>> {
    const { accountId } = await this.getClient();
    return this.apiRequest('DELETE', `/accounts/${accountId}/gateway/rules/${ruleId}`);
  }

  async getContentCategories(): Promise<CloudflareResponse<CloudflareContentCategory[]>> {
    const { accountId } = await this.getClient();
    const res = await this.apiRequest<CloudflareContentCategory[]>('GET', `/accounts/${accountId}/gateway/categories`);
    return res;
  }

  async getGatewayAppTypes(): Promise<CloudflareResponse<FirewallAppType[]>> {
    const { accountId } = await this.getClient();
    return await this.apiRequest<FirewallAppType[]>('GET', `/accounts/${accountId}/gateway/app_types`);
  }

  async getGatewayUiOptions(): Promise<CloudflareResponse<any>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<any>('GET', `/accounts/${accountId}/gateway/wf/ui_options`);
  }

  async getDlpFileTypes(): Promise<CloudflareResponse<any>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<any>('GET', `/accounts/${accountId}/dlp/filetypes?legacy=false`);
  }
  //#endregion

  async importData(): Promise<{ users: number; applications: number }> {
    console.log('Starting Cloudflare data import...');
    const db = this.prisma;
    const results = {
      users: 0,
      applications: 0
    };

    try {
      // 1. Import Users (Account Members)
      console.log('Fetching account members...');
      const membersRes = await this.getAccountMembers(1, 100);
      if (membersRes?.result) {
        const fetchedUserEmails = new Set<string>();
        console.log(`Found ${membersRes.result.length} members. Upserting to database...`);
        for (const member of membersRes.result) {
          const cfUser = member.user;
          const name =
            `${cfUser?.first_name || ''} ${cfUser?.last_name || ''}`.trim() ||
            cfUser?.email
              ?.split('@')[0]
              .split(/[._-]+/)
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ') ||
            'Unknown';

          if (cfUser && cfUser.email) {
            fetchedUserEmails.add(cfUser.email);
            await db.user.upsert({
              where: { email: cfUser.email },
              update: { cloudflareId: member.id },
              create: {
                email: cfUser.email,
                name,
                cloudflareId: member.id,
                role: member.roles?.some((r) => r.name === 'Super Administrator - All Privileges') ? 'CLOUDFLARE ADMIN' : 'MEMBER'
              }
            });
            results.users++;
          }
        }

        const localUsers = await db.user.findMany({
          where: { role: { not: 'ADMIN' } },
          select: { email: true }
        });

        const orphansToDelete = localUsers.filter((u) => !fetchedUserEmails.has(u.email)).map((u) => u.email);

        if (orphansToDelete.length > 0) {
          console.log(`Cleaning up ${orphansToDelete.length} orphan users...`);
          await db.user.deleteMany({
            where: { email: { in: orphansToDelete } }
          });
        }
      }

      //Read DNS Records
      const zones = await this.getZones();
      const dnsRecords: CloudflareDNSRecord[] = [];
      const zoneDnsRecordRequests: Promise<CloudflareResponse<CloudflareDNSRecord[]>>[] = [];
      if (zones.result) {
        for (const zone of zones.result) zoneDnsRecordRequests.push(this.getDnsRecords(zone.id));
        const zoneDnsRes = await Promise.all(zoneDnsRecordRequests);
        for (const dnsRes of zoneDnsRes) dnsRecords.splice(dnsRecords.length, 0, ...dnsRes.result);
      }

      //Read Tunnel Configurations
      const tunnels = await this.getTunnels();
      const tunnelConfigurations: CloudflareIngressRule[] = [];
      const tunnelConfigRequests: Promise<CloudflareResponse<CloudflareTunnelConfig>>[] = [];
      if (tunnels.result) {
        for (const tunnel of tunnels.result) tunnelConfigRequests.push(this.getTunnelConfig(tunnel.id));
        const tunnelConfigRes = await Promise.all(tunnelConfigRequests);
        for(const tunnelConfig of tunnelConfigRes) tunnelConfigurations.splice(tunnelConfigurations.length, 0, ...(tunnelConfig.result?.config?.ingress || []))
      }

      // 2. Import Applications (Access Applications)
      console.log('Fetching access applications...');
      const appsRes = await this.getApps();
      if (appsRes?.result) {
        const fetchedAppIds = new Set<string>();
        console.log(`Found ${appsRes.result.length} apps. Upserting to database...`);
        for (const cfApp of appsRes.result) {
          fetchedAppIds.add(cfApp.id || '');
          let publicUrl = '';
          let destinationType = '';
          let destinationUrl = '';
          let exposureType = '';
          let dnsRecordId = '';
          let tunnelId = '';
          if (cfApp?.destinations?.[0]?.type === 'public' || cfApp.type === 'bookmark' || cfApp.type === 'warp') {
            publicUrl = (cfApp?.destinations?.[0]?.type === 'public' ? cfApp?.destinations?.[0]?.uri : cfApp.domain) || '';
            exposureType = cfApp?.policies && Array.isArray(cfApp.policies) && cfApp.policies.length > 0 ? ApplicationExposureTypeEnum.PUBLIC_WITH_ACCESS : ApplicationExposureTypeEnum.PUBLIC;
            
            //Set DNS Record
            dnsRecordId = dnsRecords.find(dns=>dns.name.toLowerCase() === publicUrl.toLowerCase())?.id || '';
            
            //Set TunnelId
            tunnelId = dnsRecords.find(dns=>dns.name.toLowerCase() === publicUrl.toLowerCase())?.content?.split('.cfargotunnel.com')[0] || ''

            // Set Destination URL
            destinationUrl = tunnelConfigurations.find(config=>config.hostname?.toLowerCase() === publicUrl.toLowerCase())?.service || ''

            destinationType = 'URI';
          } else if (cfApp?.destinations?.[0]?.type === 'private') {
            destinationUrl = `${cfApp.destinations[0].cidr?.split('/')[0]}:${cfApp.destinations[0].port_range || ''}`;
            destinationType = 'CIDR';
            exposureType = ApplicationExposureTypeEnum.WARP;
          }

          await db.application.upsert({
            where: { id: cfApp.id },
            update: {
              name: cfApp.name,
              publicUrl,
              destinationType,
              destinationUrl,
              exposureType,
              tunnelId,
              dnsRecordId,
              logoUrl: cfApp.logo_url
            },
            create: {
              id: cfApp.id,
              name: cfApp.name || '',
              publicUrl,
              destinationType,
              destinationUrl,
              exposureType,
              tunnelId,
              dnsRecordId,
              logoUrl: cfApp.logo_url
            }
          });
          results.applications++;
        }

        const localApps = await db.application.findMany({
          select: { id: true }
        });

        const orphansToDelete = localApps.filter((a) => !fetchedAppIds.has(a.id)).map((a) => a.id);

        if (orphansToDelete.length > 0) {
          console.log(`Cleaning up ${orphansToDelete.length} orphan applications...`);
          await db.application.deleteMany({
            where: { id: { in: orphansToDelete } }
          });
        }
      }

      console.log('Import completed successfully:', results);
      return results;
    } catch (e: unknown) {
      const err = e as Error;
      console.error('Import failed with error:', err.message);
      this.handleError('importData', err);
      throw e;
    }
  }

  async getDNSLogs(query: string): Promise<CloudflareResponse<CloudflareTrafficLog<CloudflareDNSLog>>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareTrafficLog<CloudflareDNSLog>>('GET', `/accounts/${accountId}/gateway-analytics/activities${query ? `?${query}` : ''}`);
  }

  async getNetworkLogs(query: string): Promise<CloudflareResponse<CloudflareTrafficLog<CloudflareNetworkLog>>> {
    const { accountId } = await this.getClient();
    return this.apiRequest<CloudflareTrafficLog<CloudflareNetworkLog>>('GET', `/accounts/${accountId}/gateway-analytics/activities/l4${query ? `?${query}` : ''}`);
  }

  async getHTTPLogs(query: string): Promise<CloudflareResponse<CloudflareTrafficLog<CloudflareHTTPLog>>> {
    const { accountId } = await this.getClient();
    return await this.apiRequest<CloudflareTrafficLog<CloudflareHTTPLog>>('GET', `/accounts/${accountId}/gateway-analytics/activities/http${query ? `?${query}` : ''}`);
  }

  async fetchPaginatedLogs(logFn: Function, query: string): Promise<CloudflareDNSLog[] | CloudflareNetworkLog[] | CloudflareHTTPLog[]> {
    let page = 0;
    let res;
    const allLogs: any[] = [];
    do {
      res = await logFn(`${query ? `${query}&` : '?'}page=${++page}&limit=100`);
      allLogs.push(...(res.result.logs || []));
    } while (res.result.logs.length > 0);
    return allLogs;
  }

  async getTrafficLogs(dnsQuery: string, l4Query: string, httpQuery: string): Promise<CloudflareResponse<{ dns: CloudflareDNSLog[]; l4: CloudflareNetworkLog[]; http: CloudflareHTTPLog[] }>> {
    try {
      const [dns, l4, http] = await Promise.all([this.fetchPaginatedLogs(this.getDNSLogs.bind(this), dnsQuery), this.fetchPaginatedLogs(this.getNetworkLogs.bind(this), l4Query), this.fetchPaginatedLogs(this.getHTTPLogs.bind(this), httpQuery)]);
      return {
        success: true,
        messages: [],
        errors: [],
        result: { dns: dns as CloudflareDNSLog[], l4: l4 as CloudflareNetworkLog[], http: http as CloudflareHTTPLog[] }
      };
    } catch (e: unknown) {
      return {
        success: false,
        messages: [e instanceof Error ? e.message : 'An error occurred while fetching logs'],
        errors: [{ code: 500, message: e instanceof Error ? e.message : 'An error occurred while fetching logs' }],
        result: { dns: [], l4: [], http: [] }
      };
    }
  }

  async get24HrLogs(): Promise<CloudflareResponse<{ dns: CloudflareDNSLog[]; l4: CloudflareNetworkLog[]; http: CloudflareHTTPLog[] }>> {
    const to = parseInt((new Date().getTime() / 1000).toString());
    const from = to - 24 * 60 * 60;
    const query = `from=${from}&to=${to}`;
    return await this.getTrafficLogs(query, query, query);
  }

  //#region Cloudflare Verification Requests
  async verifyCredentials(token: string, email: string, accountId: string, apiKey: string): Promise<CloudflareResponse<CloudflareVerificationResult>> {
    //verify token
    const result: CloudflareVerificationResult = {
      token: { success: false, message: 'API Token Not Verified' },
      account: { success: false, message: 'Account ID Not Verified' },
      apikey: { success: false, message: 'Global API Key Not Verified' }
    };
    try {
      const res = await axios.get(`https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        result.token = { success: true, message: 'Valid API Token' };
        result.account = { success: true, message: 'Valid Account ID' };
      }
    } catch (error) {
      const errorData: any = (error as AxiosError).response?.data;
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        const message: string = errorData?.errors?.[0].message || '';
        if (message == 'Invalid format for Authorization header' || message == 'Invalid API Token' || message == 'Invalid request headers') {
          result.token = { success: false, message: 'Invalid API Token' };
          result.account = { success: true, message: 'Valid Account ID' };
        } else if (message.includes('perhaps your object identifier is invalid?', 0)) {
          result.account = { success: false, message: 'Invalid Account ID' };
        }
      }
    }

    //verify global api key and email
    try {
      const res = await axios.get(`https://api.cloudflare.com/client/v4/accounts/${accountId}/members`, {
        headers: { 'x-auth-key': apiKey, 'x-auth-email': email }
      });

      if (res.data.success) {
        result.apikey = { success: true, message: 'Valid User EMail and Global API Key' };
      }
    } catch (error) {
      const errorData: any = (error as AxiosError).response?.data;
      if (errorData?.errors && Array.isArray(errorData.errors)) {
        const message: string = errorData?.errors?.[0].message || '';
        result.apikey.success = false;
        if (message == 'Authentication error') {
          result.apikey.message = 'Invalid Cloudflare Email';
        } else if (message === 'Authentication failed (status: 400)') {
          result.apikey.message = 'Invalid Global API Key';
        } else {
          result.apikey.message = 'Invalid Cloudflare Email or Global API Key';
        }
      }
    }

    return {
      errors: [],
      messages: [],
      success: result.token.success && result.account.success && result.apikey.success,
      result
    };
  }
  //#endregion

  private handleError(method: string, e: Error) {
    console.error(`Cloudflare API Error [${method}]:`, {
      message: e.message,
      name: e.name,
      stack: e.stack,
      status: (e as any).status,
      error: (e as any).error
    });
    throw e;
  }
}
