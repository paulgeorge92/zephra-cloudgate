"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TunnelsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const cloudflare_service_1 = require("../cloudflare/cloudflare.service");
let TunnelsService = class TunnelsService {
    prisma;
    cf;
    constructor(prisma, cf) {
        this.prisma = prisma;
        this.cf = cf;
    }
    async findAll(page, per_page) {
        try {
            const [cfTunnelsRes, cfRoutesRes, apps] = await Promise.all([this.cf.getTunnels(page, per_page), this.cf.getPrivateNetworks(), this.prisma.application.findMany()]);
            const cfTunnels = cfTunnelsRes?.result || [];
            const cfRoutes = cfRoutesRes?.result || [];
            // Fetch configurations for each tunnel in parallel
            const tunnelConfigs = await Promise.all(cfTunnels.map(async (t) => {
                const configRes = await this.cf.getTunnelConfig(t.id || '');
                return { cfTunnelId: t.id, config: configRes?.result };
            }));
            const result = cfTunnels.map((ct) => {
                const routes = cfRoutes.filter((r) => r.tunnel_id === ct.id).map((r) => r.network || '');
                const tConfig = tunnelConfigs.find((tc) => tc.cfTunnelId === ct.id)?.config;
                const ingressRules = tConfig?.config?.ingress || [];
                // Count applications (ingress rules that have a hostname)
                const appCount = ingressRules.filter((rule) => rule.hostname).length;
                // Also count applications in local DB that reference this tunnel
                const localAppsCount = apps.filter((a) => a.tunnelId === ct.id).length;
                return {
                    id: ct.id || '',
                    cfTunnelId: ct.id || '',
                    name: ct.name || '',
                    applicationCount: Math.max(appCount, localAppsCount),
                    routes: routes,
                    conns_active_at: ct.conns_active_at || null,
                    conns_inactive_at: ct.conns_inactive_at || null,
                    createdAt: ct.created_at,
                    status: ct.status === 'healthy' || ct.status === 'degraded' ? 'CONNECTED' : 'DISCONNECTED'
                };
            });
            return {
                result: result,
                result_info: cfTunnelsRes?.result_info,
                errors: cfTunnelsRes?.errors || [],
                messages: cfTunnelsRes?.messages || [],
                success: cfTunnelsRes?.success || false
            };
        }
        catch (e) {
            console.error('Failed to merge Cloudflare data in findAll:', e);
            return {
                result: [],
                success: false,
                errors: [{ code: 500, message: e.message || 'An error occurred while fetching tunnels' }],
                messages: []
            };
        }
    }
    async findOne(id) {
        const cfTunnelsRes = await this.cf.getTunnels();
        const ct = (cfTunnelsRes?.result || []).find((t) => t.id === id);
        if (!ct)
            throw new common_1.NotFoundException('Tunnel not found in Cloudflare');
        return {
            id: ct.id || '',
            cfTunnelId: ct.id || '',
            name: ct.name || '',
            status: ct.status === 'healthy' || ct.status === 'degraded' ? 'CONNECTED' : 'DISCONNECTED'
        };
    }
    async create(name) {
        const cfRes = await this.cf.createTunnel(name);
        if (!cfRes) {
            throw new Error('Failed to create tunnel in Cloudflare');
        }
        const cfTunnel = cfRes;
        return {
            id: cfTunnel.id || '',
            cfTunnelId: cfTunnel.id || '',
            name: cfTunnel.name || '',
            status: 'DISCONNECTED',
            token: cfTunnel.token
        };
    }
    async getStatus(id) {
        const cfRes = (await this.cf.getTunnelConnections(id));
        const connections = cfRes?.result || [];
        const isConnected = Array.isArray(connections) && connections.length > 0;
        return {
            id: id,
            cfTunnelId: id,
            status: isConnected ? 'CONNECTED' : 'DISCONNECTED',
            connections: isConnected ? connections : []
        };
    }
    async getDetail(id) {
        try {
            const [cfTunnelsRes, cfRoutesRes, cfConfigRes, cfTokenRes] = await Promise.all([this.cf.getTunnel(id), this.cf.getPrivateNetworks(), this.cf.getTunnelConfig(id), this.cf.getTunnelToken(id)]);
            const cfTunnel = cfTunnelsRes?.result;
            if (!cfTunnel)
                throw new common_1.NotFoundException('Tunnel not found in Cloudflare');
            const routes = (cfRoutesRes?.result || []).filter((r) => r.tunnel_id === id);
            const config = cfConfigRes?.result?.config || { ingress: [] };
            const token = cfTokenRes?.result;
            return {
                id: cfTunnel.id || '',
                cfTunnelId: cfTunnel.id || '',
                name: cfTunnel.name || '',
                createdAt: cfTunnel.created_at,
                cfOverview: cfTunnel,
                routes: routes.map((r) => ({
                    id: r.id || '',
                    network: r.network || '',
                    tunnel_id: r.tunnel_id || '',
                    created_at: r.created_at || ''
                })),
                config: {
                    ingress: config.ingress.filter(rule => rule.service !== 'http_status:404'),
                },
                token,
                status: cfTunnel.status === 'healthy' || cfTunnel.status === 'degraded' ? 'CONNECTED' : 'DISCONNECTED'
            };
        }
        catch (e) {
            console.error('Failed to get tunnel detail from Cloudflare:', e);
            throw e;
        }
    }
    async update(id, name) {
        await this.cf.updateTunnel(id, name);
        return { id, name };
    }
    async manageRoutes(id, action, cidr, routeId) {
        if (action === 'ADD' && cidr) {
            return this.cf.createPrivateNetwork(cidr, id);
        }
        else if (action === 'DELETE' && routeId) {
            return this.cf.deletePrivateNetwork(routeId);
        }
        throw new Error('Invalid route management action or missing parameters');
    }
    async manageConfig(id, ingressRules) {
        return this.cf.updateTunnelConfig(id, { ingress: ingressRules });
    }
    async getToken(id) {
        const cfTokenRes = await this.cf.getTunnelToken(id);
        return { token: cfTokenRes?.result, cfTunnelId: id };
    }
    async delete(id) {
        await this.cf.deleteTunnel(id);
        return { id, success: true };
    }
};
exports.TunnelsService = TunnelsService;
exports.TunnelsService = TunnelsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudflare_service_1.CloudflareService])
], TunnelsService);
//# sourceMappingURL=tunnels.service.js.map