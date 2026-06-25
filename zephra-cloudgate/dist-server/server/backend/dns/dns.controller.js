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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DnsController = void 0;
const common_1 = require("@nestjs/common");
const dns_service_1 = require("./dns.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let DnsController = class DnsController {
    dnsService;
    constructor(dnsService) {
        this.dnsService = dnsService;
    }
    async create(body) {
        const result = await this.dnsService.create(body.zoneId, body.name, body.tunnelId, body.comment);
        return { success: true, result: result };
    }
    async delete(body) {
        const result = await this.dnsService.delete(body.zoneId, body.recordId);
        return { success: true, result: result };
    }
};
exports.DnsController = DnsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DnsController.prototype, "create", null);
__decorate([
    (0, common_1.Delete)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DnsController.prototype, "delete", null);
exports.DnsController = DnsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('dns'),
    __metadata("design:paramtypes", [dns_service_1.DnsService])
], DnsController);
//# sourceMappingURL=dns.controller.js.map