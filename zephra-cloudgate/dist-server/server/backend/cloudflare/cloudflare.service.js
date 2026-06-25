"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareService = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-function-type */
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const crypto_util_1 = require("../utils/crypto.util");
const axios_1 = __importDefault(require("axios"));
const types_1 = require("../shared/types");
const CONFIG_KEYS = {
    CF_ACCOUNT_ID: 'cf_account_id',
    CF_EMAIL: 'cf_email',
    CF_GLOBAL_API_KEY: 'cf_global_api_key',
    CF_API_TOKEN: 'cf_api_token'
};
let CloudflareService = class CloudflareService {
    prisma;
    BASE_URL = 'https://api.cloudflare.com/client/v4';
    legacyConfigChecked = false;
    constructor(prisma) {
        this.prisma = prisma;
    }
    //#region API Initiator and interceptor
    async getClient() {
        const config = await this.getConfigEntries([CONFIG_KEYS.CF_ACCOUNT_ID, CONFIG_KEYS.CF_GLOBAL_API_KEY, CONFIG_KEYS.CF_EMAIL]);
        const accountId = config[CONFIG_KEYS.CF_ACCOUNT_ID] || '';
        //const token = config[CONFIG_KEYS.CF_API_TOKEN] ? decrypt(config[CONFIG_KEYS.CF_API_TOKEN] || '') : '';
        const apiKey = config[CONFIG_KEYS.CF_GLOBAL_API_KEY] ? (0, crypto_util_1.decrypt)(config[CONFIG_KEYS.CF_GLOBAL_API_KEY] || '') : '';
        const email = config[CONFIG_KEYS.CF_EMAIL] || '';
        if (!accountId) {
            throw new Error('Cloudflare account is not configured');
        }
        const headers = {
            'Content-Type': 'application/json'
        };
        if (apiKey && email) {
            headers['X-Auth-Key'] = apiKey;
            headers['X-Auth-Email'] = email;
        }
        else {
            throw new Error('No valid Cloudflare credentials found');
        }
        return { accountId, headers };
    }
    async getConfigEntries(keys) {
        await this.ensureLegacyConfigMigrated();
        const rows = await this.prisma.configuration.findMany({
            where: { name: { in: keys } },
            orderBy: { id: 'asc' }
        });
        const map = {};
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
    async setConfigValue(name, value) {
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
    async ensureLegacyConfigMigrated() {
        if (this.legacyConfigChecked)
            return;
        this.legacyConfigChecked = true;
        const trackedKeys = Object.values(CONFIG_KEYS);
        const hasStoredConfig = await this.prisma.configuration.count({
            where: { name: { in: trackedKeys } }
        });
        if (hasStoredConfig > 0)
            return;
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const configPath = path.join(process.cwd(), 'config.json');
        if (!fs.existsSync(configPath))
            return;
        const legacyConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (legacyConfig.cf_account_id)
            await this.setConfigValue(CONFIG_KEYS.CF_ACCOUNT_ID, legacyConfig.cf_account_id);
        if (legacyConfig.cf_email)
            await this.setConfigValue(CONFIG_KEYS.CF_EMAIL, legacyConfig.cf_email);
        if (legacyConfig.cf_global_api_key)
            await this.setConfigValue(CONFIG_KEYS.CF_GLOBAL_API_KEY, legacyConfig.cf_global_api_key);
        if (legacyConfig.cf_api_token)
            await this.setConfigValue(CONFIG_KEYS.CF_API_TOKEN, legacyConfig.cf_api_token);
    }
    async apiRequest(method, path, data, params) {
        const { headers } = await this.getClient();
        const url = `${this.BASE_URL}${path}`;
        try {
            const response = await (0, axios_1.default)({ method, url, data, params, headers });
            const cfData = response.data;
            return {
                result: cfData.result,
                success: cfData.success,
                errors: cfData.errors || [],
                messages: cfData.messages || [],
                result_info: cfData.result_info
            };
        }
        catch (error) {
            const errorData = error.response?.data || {};
            throw new Error(errorData.errors?.[0]?.message || error.message || 'Cloudflare API Request Failed');
        }
    }
    //#endregion
    //#region Member API Requests
    async getAccountMembers(page, per_page) {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/members`, null, { page: page || 1, per_page: per_page || 5000 });
    }
    async addAccountMember(name, email, roles) {
        const { accountId } = await this.getClient();
        return this.apiRequest('POST', `/accounts/${accountId}/members`, { email, roles });
    }
    async addAccountMemberByRole(name, email, roleName) {
        const { accountId } = await this.getClient();
        try {
            const allRoles = await this.getAccountRoles();
            if (!allRoles)
                throw new Error('Could not fetch Cloudflare roles');
            const roleNamesToFind = roleName === 'ADMIN' ? ['Super Administrator - All Privileges'] : ['Minimal Account Access', 'Cloudflare Zero Trust Read Only'];
            const targetRoleIds = allRoles.filter((r) => roleNamesToFind.includes(r.name)).map((r) => r.id);
            if (targetRoleIds.length === 0) {
                throw new Error(`Could not find matching Cloudflare roles for ${roleName}`);
            }
            const res = await this.apiRequest('POST', `/accounts/${accountId}/members`, { email, roles: targetRoleIds });
            return { ...res, id: res.result?.id };
        }
        catch (e) {
            this.handleError('addAccountMemberByRole', e);
        }
    }
    async getAccountRoles(per_page, pageNumber) {
        const { accountId } = await this.getClient();
        try {
            const rolesRes = await this.apiRequest('GET', `/accounts/${accountId}/roles`, null, { per_page: per_page || 5000, page: pageNumber || 1 });
            let roles = rolesRes.result || [];
            const info = rolesRes.result_info;
            if (!pageNumber && info && info.total_pages > 1) {
                for (let p = 2; p <= info.total_pages; p++) {
                    const paginated = await this.apiRequest('GET', `/accounts/${accountId}/roles`, null, { per_page: 100, page: p });
                    roles = roles.concat(paginated.result || []);
                }
            }
            return roles;
        }
        catch (e) {
            this.handleError('getAccountRoles', e);
            return undefined;
        }
    }
    async deleteAccountMemberByEmail(email, cloudflareId) {
        const { accountId } = await this.getClient();
        try {
            let memberId = cloudflareId;
            if (!memberId) {
                const membersRes = await this.getAccountMembers(1, 100);
                const member = membersRes.result?.find((m) => m.user.email === email || m.email === email);
                if (!member) {
                    console.warn(`Member with email ${email} not found in Cloudflare`);
                    return;
                }
                memberId = member.id;
            }
            return this.apiRequest('DELETE', `/accounts/${accountId}/members/${memberId}`);
        }
        catch (e) {
            this.handleError('deleteAccountMemberByEmail', e);
        }
    }
    async updateAccountMemberRoleByEmail(email, roleName, cloudflareId) {
        const { accountId } = await this.getClient();
        try {
            let memberId = cloudflareId;
            if (!memberId) {
                const membersRes = await this.getAccountMembers(1, 100);
                const member = membersRes.result?.find((m) => m.user.email === email || m.email === email);
                if (!member) {
                    console.warn(`Member with email ${email} not found in Cloudflare`);
                    return;
                }
                memberId = member.id;
            }
            const allRoles = await this.getAccountRoles();
            if (!allRoles)
                throw new Error('Could not fetch Cloudflare roles');
            const roleNamesToFind = roleName === 'ADMIN' ? ['Super Administrator - All Privileges'] : ['Minimal Account Access', 'Cloudflare Zero Trust Read Only'];
            const targetRoleIds = allRoles.filter((r) => roleNamesToFind.includes(r.name)).map((r) => r.id);
            if (targetRoleIds.length === 0) {
                throw new Error(`Could not find matching Cloudflare roles for ${roleName}`);
            }
            return this.apiRequest('PUT', `/accounts/${accountId}/members/${memberId}`, { roles: targetRoleIds });
        }
        catch (e) {
            this.handleError('updateAccountMemberRoleByEmail', e);
        }
    }
    //#endregion
    //#region Tunnel API Requests
    async getTunnels(page, per_page) {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/cfd_tunnel`, null, { page: page || 1, per_page: per_page || 5000 });
    }
    async getTunnel(id) {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/cfd_tunnel/${id}`);
    }
    async createTunnel(name) {
        const { accountId } = await this.getClient();
        try {
            const tunnelRes = await this.apiRequest('POST', `/accounts/${accountId}/cfd_tunnel`, { name, config_src: 'cloudflare' });
            const tunnel = tunnelRes.result;
            if (!tunnel)
                throw new Error('Failed to create tunnel');
            const tokenRes = await this.apiRequest('GET', `/accounts/${accountId}/cfd_tunnel/${tunnel.id}/token`);
            return { ...tunnel, token: tokenRes.result || '' };
        }
        catch (e) {
            this.handleError('createTunnel', e);
        }
    }
    async updateTunnel(tunnelId, name) {
        const { accountId } = await this.getClient();
        return this.apiRequest('PATCH', `/accounts/${accountId}/cfd_tunnel/${tunnelId}`, { name });
    }
    async deleteTunnel(tunnelId) {
        const { accountId } = await this.getClient();
        return this.apiRequest('DELETE', `/accounts/${accountId}/cfd_tunnel/${tunnelId}`);
    }
    async getTunnelConnections(tunnelId) {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/cfd_tunnel/${tunnelId}/connections`);
    }
    async getTunnelConfig(tunnelId) {
        const { accountId } = await this.getClient();
        try {
            return await this.apiRequest('GET', `/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`);
        }
        catch (e) {
            console.warn(`Could not fetch config for tunnel ${tunnelId}:`, e.message);
            return {
                result: {},
                success: false,
                errors: [{ code: 0, message: e.message }],
                messages: []
            };
        }
    }
    async updateTunnelConfig(tunnelId, config) {
        const { accountId } = await this.getClient();
        return this.apiRequest('PUT', `/accounts/${accountId}/cfd_tunnel/${tunnelId}/configurations`, { config });
    }
    async getTunnelToken(tunnelId) {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/cfd_tunnel/${tunnelId}/token`);
    }
    async getPrivateNetworks() {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/teamnet/routes`);
    }
    async createPrivateNetwork(cidr, tunnelId) {
        const { accountId } = await this.getClient();
        return this.apiRequest('POST', `/accounts/${accountId}/teamnet/routes`, {
            network: cidr,
            tunnel_id: tunnelId
        });
    }
    async deletePrivateNetwork(routeId) {
        const { accountId } = await this.getClient();
        return this.apiRequest('DELETE', `/accounts/${accountId}/teamnet/routes/${routeId}`);
    }
    //#endregion
    //#region Domain API Requests
    async getZones() {
        try {
            const response = await this.apiRequest('GET', '/zones', null, { per_page: 50 });
            let zones = response.result || [];
            const info = response.result_info;
            if (info && info.total_pages > 1) {
                for (let p = 2; p <= info.total_pages; p++) {
                    const paginated = await this.apiRequest('GET', '/zones', null, { per_page: 50, page: p });
                    zones = zones.concat(paginated.result || []);
                }
            }
            return { ...response, result: zones };
        }
        catch (e) {
            this.handleError('getZones', e);
            return {
                result: [],
                success: false,
                errors: [{ code: 500, message: e.message }],
                messages: []
            };
        }
    }
    async getDnsRecords(zoneId, name) {
        const params = { per_page: 5000 };
        if (name) {
            params.name = name;
        }
        return this.apiRequest('GET', `/zones/${zoneId}/dns_records`, null, params);
    }
    async createDnsRecord(zoneId, data) {
        return this.apiRequest('POST', `/zones/${zoneId}/dns_records`, data);
    }
    async deleteDnsRecord(zoneId, recordId) {
        return this.apiRequest('DELETE', `/zones/${zoneId}/dns_records/${recordId}`);
    }
    //#endregion
    //#region Application and Access API Requests
    async getAccessApps() {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/access/apps`, null, { per_page: 100 });
    }
    async getAccessApp(id) {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/access/apps/${id}`);
    }
    async createAccessApp(data) {
        const { accountId } = await this.getClient();
        return this.apiRequest('POST', `/accounts/${accountId}/access/apps`, data);
    }
    async updateAccessApp(appId, data) {
        const { accountId } = await this.getClient();
        return this.apiRequest('PUT', `/accounts/${accountId}/access/apps/${appId}`, data);
    }
    async deleteAccessApp(appId) {
        const { accountId } = await this.getClient();
        return this.apiRequest('DELETE', `/accounts/${accountId}/access/apps/${appId}`);
    }
    async getAccessPolicies(page, per_page) {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/access/policies`, null, { page: page || 1, per_page: per_page || 5000 });
    }
    async getAccessPolicy(policyId) {
        const { accountId } = await this.getClient();
        const res = await this.apiRequest('GET', `/accounts/${accountId}/access/policies/${policyId}`);
        res.result = { ...res.result, account_id: accountId };
        return { ...res };
    }
    async createAccessPolicy(data) {
        const { accountId } = await this.getClient();
        return this.apiRequest('POST', `/accounts/${accountId}/access/policies`, data);
    }
    async deleteAccessPolicy(policyId) {
        const { accountId } = await this.getClient();
        return this.apiRequest('DELETE', `/accounts/${accountId}/access/policies/${policyId}`);
    }
    async getAccessGroups() {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/access/groups`);
    }
    //#endregion
    //#region Device API Requests
    async getDevices() {
        const { accountId } = await this.getClient();
        try {
            return await this.apiRequest('GET', `/accounts/${accountId}/devices`);
        }
        catch (e) {
            this.handleError('getDevices', e);
            return {
                result: [],
                success: false,
                errors: [{ code: 500, message: e.message }],
                messages: [e.message || 'An error occurred while fetching devices']
            };
        }
    }
    async getDevicePostureRules() {
        const { accountId } = await this.getClient();
        try {
            return await this.apiRequest('GET', `/accounts/${accountId}/devices/posture`);
        }
        catch (e) {
            this.handleError('getDevicePostureRules', e);
            return {
                result: [],
                success: false,
                errors: [{ code: 500, message: e.message }],
                messages: [e.message || 'An error occurred while fetching device posture rules']
            };
        }
    }
    //#endregion
    //#region Reuasable Lists API Requests
    async getGatewayLists() {
        const { accountId } = await this.getClient();
        try {
            return await this.apiRequest('GET', `/accounts/${accountId}/gateway/lists`);
        }
        catch (e) {
            this.handleError('getGatewayLists', e);
            return {
                result: [],
                success: false,
                errors: [{ code: 500, message: e.message }],
                messages: [e.message || 'An error occurred while fetching gateway lists']
            };
        }
    }
    async getGatewayList(listId) {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/gateway/lists/${listId}`);
    }
    async createGatewayList(payload) {
        const { accountId } = await this.getClient();
        return this.apiRequest('POST', `/accounts/${accountId}/gateway/lists`, payload);
    }
    async updateGatewayList(listId, payload) {
        const { accountId } = await this.getClient();
        return this.apiRequest('PATCH', `/accounts/${accountId}/gateway/lists/${listId}`, payload);
    }
    async updateGatewayListDetails(listId, payload) {
        const { accountId } = await this.getClient();
        return this.apiRequest('PUT', `/accounts/${accountId}/gateway/lists/${listId}`, payload);
    }
    async deleteGatewayList(listId) {
        const { accountId } = await this.getClient();
        return this.apiRequest('DELETE', `/accounts/${accountId}/gateway/lists/${listId}`);
    }
    //#endregion
    //#region Firewall Rules API Requests
    async getGatewayRules() {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/gateway/rules`);
    }
    async getGatewayRule(ruleId) {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/gateway/rules/${ruleId}`);
    }
    async createGatewayRule(payload) {
        const { accountId } = await this.getClient();
        return this.apiRequest('POST', `/accounts/${accountId}/gateway/rules`, payload);
    }
    async updateGatewayRule(ruleId, payload) {
        const { accountId } = await this.getClient();
        return this.apiRequest('PUT', `/accounts/${accountId}/gateway/rules/${ruleId}`, payload);
    }
    async deleteGatewayRule(ruleId) {
        const { accountId } = await this.getClient();
        return this.apiRequest('DELETE', `/accounts/${accountId}/gateway/rules/${ruleId}`);
    }
    async getContentCategories() {
        const { accountId } = await this.getClient();
        const res = await this.apiRequest('GET', `/accounts/${accountId}/gateway/categories`);
        return res;
    }
    async getGatewayAppTypes() {
        const { accountId } = await this.getClient();
        return await this.apiRequest('GET', `/accounts/${accountId}/gateway/app_types`);
    }
    async getGatewayUiOptions() {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/gateway/wf/ui_options`);
    }
    async getDlpFileTypes() {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/dlp/filetypes?legacy=false`);
    }
    //#endregion
    async importData() {
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
                const fetchedUserEmails = new Set();
                console.log(`Found ${membersRes.result.length} members. Upserting to database...`);
                for (const member of membersRes.result) {
                    const cfUser = member.user;
                    const name = `${cfUser?.first_name || ''} ${cfUser?.last_name || ''}`.trim() ||
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
            const dnsRecords = [];
            const zoneDnsRecordRequests = [];
            if (zones.result) {
                for (const zone of zones.result)
                    zoneDnsRecordRequests.push(this.getDnsRecords(zone.id));
                const zoneDnsRes = await Promise.all(zoneDnsRecordRequests);
                for (const dnsRes of zoneDnsRes)
                    dnsRecords.splice(dnsRecords.length, 0, ...dnsRes.result);
            }
            //Read Tunnel Configurations
            const tunnels = await this.getTunnels();
            const tunnelConfigurations = [];
            const tunnelConfigRequests = [];
            if (tunnels.result) {
                for (const tunnel of tunnels.result)
                    tunnelConfigRequests.push(this.getTunnelConfig(tunnel.id));
                const tunnelConfigRes = await Promise.all(tunnelConfigRequests);
                for (const tunnelConfig of tunnelConfigRes)
                    tunnelConfigurations.splice(tunnelConfigurations.length, 0, ...(tunnelConfig.result?.config?.ingress || []));
            }
            // 2. Import Applications (Access Applications)
            console.log('Fetching access applications...');
            const appsRes = await this.getAccessApps();
            if (appsRes?.result) {
                const fetchedAppIds = new Set();
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
                        exposureType = cfApp?.policies && Array.isArray(cfApp.policies) && cfApp.policies.length > 0 ? types_1.ApplicationExposureTypeEnum.PUBLIC_WITH_ACCESS : types_1.ApplicationExposureTypeEnum.PUBLIC;
                        //Set DNS Record
                        dnsRecordId = dnsRecords.find(dns => dns.name.toLowerCase() === publicUrl.toLowerCase())?.id || '';
                        //Set TunnelId
                        tunnelId = dnsRecords.find(dns => dns.name.toLowerCase() === publicUrl.toLowerCase())?.content?.split('.cfargotunnel.com')[0] || '';
                        // Set Destination URL
                        destinationUrl = tunnelConfigurations.find(config => config.hostname?.toLowerCase() === publicUrl.toLowerCase())?.service || '';
                        destinationType = 'URI';
                    }
                    else if (cfApp?.destinations?.[0]?.type === 'private') {
                        destinationUrl = `${cfApp.destinations[0].cidr?.split('/')[0]}:${cfApp.destinations[0].port_range || ''}`;
                        destinationType = 'CIDR';
                        exposureType = types_1.ApplicationExposureTypeEnum.WARP;
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
        }
        catch (e) {
            const err = e;
            console.error('Import failed with error:', err.message);
            this.handleError('importData', err);
            throw e;
        }
    }
    async getDNSLogs(query) {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/gateway-analytics/activities${query ? `?${query}` : ''}`);
    }
    async getNetworkLogs(query) {
        const { accountId } = await this.getClient();
        return this.apiRequest('GET', `/accounts/${accountId}/gateway-analytics/activities/l4${query ? `?${query}` : ''}`);
    }
    async getHTTPLogs(query) {
        const { accountId } = await this.getClient();
        return await this.apiRequest('GET', `/accounts/${accountId}/gateway-analytics/activities/http${query ? `?${query}` : ''}`);
    }
    async fetchPaginatedLogs(logFn, query) {
        let page = 0;
        let res;
        const allLogs = [];
        do {
            res = await logFn(`${query ? `${query}&` : '?'}page=${++page}&limit=100`);
            allLogs.push(...(res.result.logs || []));
        } while (res.result.logs.length > 0);
        return allLogs;
    }
    async getTrafficLogs(dnsQuery, l4Query, httpQuery) {
        try {
            const [dns, l4, http] = await Promise.all([this.fetchPaginatedLogs(this.getDNSLogs.bind(this), dnsQuery), this.fetchPaginatedLogs(this.getNetworkLogs.bind(this), l4Query), this.fetchPaginatedLogs(this.getHTTPLogs.bind(this), httpQuery)]);
            return {
                success: true,
                messages: [],
                errors: [],
                result: { dns: dns, l4: l4, http: http }
            };
        }
        catch (e) {
            return {
                success: false,
                messages: [e instanceof Error ? e.message : 'An error occurred while fetching logs'],
                errors: [{ code: 500, message: e instanceof Error ? e.message : 'An error occurred while fetching logs' }],
                result: { dns: [], l4: [], http: [] }
            };
        }
    }
    async get24HrLogs() {
        const to = parseInt((new Date().getTime() / 1000).toString());
        const from = to - 24 * 60 * 60;
        const query = `from=${from}&to=${to}`;
        return await this.getTrafficLogs(query, query, query);
    }
    //#region Cloudflare Verification Requests
    async verifyCredentials(token, email, accountId, apiKey) {
        //verify token
        const result = {
            token: { success: false, message: 'API Token Not Verified' },
            account: { success: false, message: 'Account ID Not Verified' },
            apikey: { success: false, message: 'Global API Key Not Verified' }
        };
        try {
            const res = await axios_1.default.get(`https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                result.token = { success: true, message: 'Valid API Token' };
                result.account = { success: true, message: 'Valid Account ID' };
            }
        }
        catch (error) {
            const errorData = error.response?.data;
            if (errorData?.errors && Array.isArray(errorData.errors)) {
                const message = errorData?.errors?.[0].message || '';
                if (message == 'Invalid format for Authorization header' || message == 'Invalid API Token' || message == 'Invalid request headers') {
                    result.token = { success: false, message: 'Invalid API Token' };
                    result.account = { success: true, message: 'Valid Account ID' };
                }
                else if (message.includes('perhaps your object identifier is invalid?', 0)) {
                    result.account = { success: false, message: 'Invalid Account ID' };
                }
            }
        }
        //verify global api key and email
        try {
            const res = await axios_1.default.get(`https://api.cloudflare.com/client/v4/accounts/${accountId}/members`, {
                headers: { 'x-auth-key': apiKey, 'x-auth-email': email }
            });
            if (res.data.success) {
                result.apikey = { success: true, message: 'Valid User EMail and Global API Key' };
            }
        }
        catch (error) {
            const errorData = error.response?.data;
            if (errorData?.errors && Array.isArray(errorData.errors)) {
                const message = errorData?.errors?.[0].message || '';
                result.apikey.success = false;
                if (message == 'Authentication error') {
                    result.apikey.message = 'Invalid Cloudflare Email';
                }
                else if (message === 'Authentication failed (status: 400)') {
                    result.apikey.message = 'Invalid Global API Key';
                }
                else {
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
    handleError(method, e) {
        console.error(`Cloudflare API Error [${method}]:`, {
            message: e.message,
            name: e.name,
            stack: e.stack,
            status: e.status,
            error: e.error
        });
        throw e;
    }
};
exports.CloudflareService = CloudflareService;
exports.CloudflareService = CloudflareService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CloudflareService);
//# sourceMappingURL=cloudflare.service.js.map