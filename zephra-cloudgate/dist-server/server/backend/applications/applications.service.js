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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const prisma_service_1 = require("../prisma.service");
const cloudflare_service_1 = require("../cloudflare/cloudflare.service");
const types_1 = require("../shared/types");
const dns_service_1 = require("../dns/dns.service");
let ApplicationsService = class ApplicationsService {
    prisma;
    cloudflare;
    dns;
    constructor(prisma, cloudflare, dns) {
        this.prisma = prisma;
        this.cloudflare = cloudflare;
        this.dns = dns;
    }
    async checkHealth(destinationUrl) {
        try {
            // Validate URL format
            const url = new URL(destinationUrl);
            // Check if protocol is supported (only HTTP/HTTPS)
            if (!['http:', 'https:'].includes(url.protocol)) {
                return {
                    status: 'UNSUPPORTED',
                    message: 'Protocol not supported. Only HTTP/HTTPS are supported.',
                    statusCode: undefined
                };
            }
            // Make a HEAD request with a timeout
            const response = await axios_1.default.get(destinationUrl, {
                timeout: 5000,
                validateStatus: () => true // Don't throw on any status code
            });
            // Status codes 200-399 are considered ONLINE
            if (response.status >= 200 && response.status < 400) {
                return {
                    status: 'ONLINE',
                    message: response.statusText,
                    statusCode: response.status
                };
            }
            // Status codes 400+ are considered OFFLINE
            else if (response.status >= 400) {
                return {
                    status: 'OFFLINE',
                    message: response.statusText,
                    statusCode: response.status
                };
            }
            return {
                status: 'UNKNOWN',
                message: 'Unable to determine server health',
                statusCode: response.status
            };
        }
        catch (error) {
            // Check if it's a URL parse error or unsupported protocol
            if (error instanceof TypeError && error.message.includes('Invalid URL')) {
                return {
                    status: 'UNSUPPORTED',
                    message: 'Invalid URL format',
                    statusCode: undefined
                };
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Connection errors, timeouts, etc. are considered OFFLINE
            return {
                status: 'OFFLINE',
                message: `Server is not responding: ${errorMessage}`,
                statusCode: undefined
            };
        }
    }
    async findAll() {
        const apps = await this.prisma.application.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return Promise.all(apps.map(async (app) => {
            const health = await this.checkHealth(app.destinationUrl);
            return {
                id: app.id,
                name: app.name,
                logoUrl: app.logoUrl ?? undefined,
                publicUrl: JSON.parse(app.publicUrl || '[]'),
                destinationType: app.destinationType,
                destinationUrl: app.destinationUrl,
                exposureType: app.exposureType,
                tunnelId: app.tunnelId ?? undefined,
                health,
                createdAt: app.createdAt.toISOString(),
                updatedAt: app.updatedAt.toISOString()
            };
        }));
    }
    async get(id) {
        const app = await this.prisma.application.findUniqueOrThrow({
            where: { id }
        });
        const health = await this.checkHealth(app.destinationUrl);
        return {
            id: app.id,
            name: app.name,
            logoUrl: app.logoUrl ?? undefined,
            publicUrl: JSON.parse(app.publicUrl || '[]'),
            destinationType: app.destinationType,
            destinationUrl: app.destinationUrl,
            exposureType: app.exposureType,
            tunnelId: app.tunnelId ?? undefined,
            health,
            createdAt: app.createdAt.toISOString(),
            updatedAt: app.updatedAt.toISOString()
        };
    }
    async create(data) {
        const { tunnelId, policy, ...rest } = data;
        let dnsRecordId = undefined;
        let accessAppId = undefined;
        try {
            // 1. Create DNS Record and Tunnel Configuration for Public and Public with Access Apps
            if (rest.exposureType !== types_1.ApplicationExposureTypeEnum.WARP) {
                const publicUrls = rest.publicUrl;
                const tunnelConfig = await this.cloudflare.getTunnelConfig(tunnelId || '');
                for (const publicUrl of publicUrls) {
                    //Create a DNS record if tunnelId is provided
                    const dnsRecord = await this.dns.create(rest.zoneId || '', publicUrl || '', tunnelId || '', `DNS record for ${rest.name} Ingress Rule`);
                    dnsRecordId = dnsRecord.result.id;
                    if (tunnelConfig.result.config.ingress.find((i) => i.hostname === rest.publicUrl)) {
                        console.log('Tunnel config already has the hostname, skipping update');
                    }
                    else {
                        tunnelConfig.result.config.ingress.splice(tunnelConfig.result.config.ingress.length - 1, 0, {
                            hostname: publicUrl || '',
                            service: rest.destinationUrl || ''
                        });
                    }
                }
                await this.cloudflare.updateTunnelConfig(tunnelId || '', tunnelConfig.result.config);
            }
            // 2. Create Access App if WARP or Public with Access
            const appConfig = {
                name: rest.name,
                type: 'self_hosted',
                destinations: [],
                allow_iframe: false,
                app_launcher_visible: true,
                logo_url: rest.logoUrl
            };
            if (rest.exposureType != types_1.ApplicationExposureTypeEnum.WARP) {
                appConfig.destinations.push({
                    type: 'public',
                    uri: `${rest.publicUrl}`
                });
            }
            else {
                const ip = rest.destinationUrl.split('://')[1];
                appConfig.destinations.push({
                    type: 'private',
                    cidr: ip.split(':')[0],
                    port_range: ip.split(':')[1]
                });
                appConfig.allow_authenticate_via_warp = true;
            }
            if (policy && policy.policyId) {
                appConfig.policies = [
                    {
                        id: policy.policyId
                    }
                ];
            }
            const accessApp = await this.cloudflare.createAccessApp(appConfig);
            accessAppId = accessApp.result.id;
            // 3. Save Application to Local Database
            const app = await this.prisma.application.create({
                data: {
                    id: accessAppId || undefined,
                    name: rest.name,
                    logoUrl: rest.logoUrl ?? null,
                    publicUrl: JSON.stringify(rest.publicUrl || '[]'),
                    destinationType: rest.destinationType,
                    destinationUrl: rest.destinationUrl,
                    exposureType: rest.exposureType,
                    tunnelId: tunnelId || null,
                    dnsRecordId: dnsRecordId || null
                }
            });
            const health = await this.checkHealth(app.destinationUrl);
            return {
                id: app.id,
                name: app.name,
                logoUrl: app.logoUrl ?? undefined,
                publicUrl: JSON.parse(app.publicUrl || '[]'),
                destinationType: app.destinationType,
                destinationUrl: app.destinationUrl,
                exposureType: app.exposureType,
                tunnelId: app.tunnelId ?? undefined,
                health,
                createdAt: app.createdAt.toISOString(),
                updatedAt: app.updatedAt.toISOString()
            };
        }
        catch (e) {
            // rollback DNS in case of any failure during the creation process
            if (dnsRecordId) {
                await this.dns.delete(rest.zoneId, dnsRecordId);
            }
            //rollback Tunnel config in case of any failure during the creation process
            if (tunnelId && rest.exposureType != types_1.ApplicationExposureTypeEnum.WARP) {
                const tunnelConfig = await this.cloudflare.getTunnelConfig(tunnelId);
                tunnelConfig.result.config.ingress = tunnelConfig.result.config.ingress.filter((i) => i.hostname !== rest.publicUrl);
                await this.cloudflare.updateTunnelConfig(tunnelId, tunnelConfig.result.config);
            }
            // rollback Access App in case of any failure during the creation process
            if (accessAppId) {
                await this.cloudflare.deleteAccessApp(accessAppId);
            }
            console.error('ApplicationsService.create Error:', e);
            throw e;
        }
    }
    async update(id, data) {
        const { tunnelId, ...rest } = data;
        const app = await this.prisma.application.update({
            where: { id },
            data: {
                name: rest.name,
                logoUrl: rest.logoUrl,
                publicUrl: JSON.stringify(rest.publicUrl),
                destinationType: rest.destinationType,
                destinationUrl: rest.destinationUrl,
                exposureType: rest.exposureType,
                tunnelId: tunnelId || undefined
            }
        });
        const health = await this.checkHealth(app.destinationUrl);
        return {
            id: app.id,
            name: app.name,
            logoUrl: app.logoUrl ?? undefined,
            publicUrl: JSON.parse(app.publicUrl || '[]'),
            destinationType: app.destinationType,
            destinationUrl: app.destinationUrl,
            exposureType: app.exposureType,
            tunnelId: app.tunnelId ?? undefined,
            health,
            createdAt: app.createdAt.toISOString(),
            updatedAt: app.updatedAt.toISOString()
        };
    }
    async delete(id) {
        await this.prisma.application.delete({ where: { id } });
        //Add delete ops from cloudflare well
        return { id };
    }
};
exports.ApplicationsService = ApplicationsService;
exports.ApplicationsService = ApplicationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudflare_service_1.CloudflareService,
        dns_service_1.DnsService])
], ApplicationsService);
//# sourceMappingURL=applications.service.js.map