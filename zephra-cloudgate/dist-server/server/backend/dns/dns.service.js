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
exports.DnsService = void 0;
const common_1 = require("@nestjs/common");
const cloudflare_service_1 = require("../cloudflare/cloudflare.service");
let DnsService = class DnsService {
    cloudflare;
    constructor(cloudflare) {
        this.cloudflare = cloudflare;
    }
    async getDnsRecords(zoneId, name) {
        return this.cloudflare.getDnsRecords(zoneId, name);
    }
    async create(zoneId, name, tunnelId, comment) {
        return this.cloudflare.createDnsRecord(zoneId, {
            name,
            ttl: 1,
            type: 'CNAME',
            comment,
            content: `${tunnelId}.cfargotunnel.com`,
            proxied: true
        });
    }
    async delete(zoneId, recordId) {
        return this.cloudflare.deleteDnsRecord(zoneId, recordId);
    }
};
exports.DnsService = DnsService;
exports.DnsService = DnsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cloudflare_service_1.CloudflareService])
], DnsService);
//# sourceMappingURL=dns.service.js.map