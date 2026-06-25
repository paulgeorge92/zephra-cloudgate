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
exports.CloudflareController = void 0;
const common_1 = require("@nestjs/common");
const cloudflare_service_1 = require("./cloudflare.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const prisma_service_1 = require("../prisma.service");
let CloudflareController = class CloudflareController {
    cloudflare;
    prisma;
    constructor(cloudflare, prisma) {
        this.cloudflare = cloudflare;
        this.prisma = prisma;
    }
    async getAccessGroups() {
        const result = await this.cloudflare.getAccessGroups();
        return { ...result, success: result.success };
    }
    async getTunnels(page, per_page) {
        const result = await this.cloudflare.getTunnels(page, per_page);
        return { ...result, success: result.success };
    }
    async getTunnel(id) {
        const result = await this.cloudflare.getTunnel(id);
        return { ...result, success: result.success };
    }
    async createTunnel(body) {
        const result = await this.cloudflare.createTunnel(body.name);
        return { success: true, result: result };
    }
    async getAccessApps(page, per_page) {
        const result = await this.cloudflare.getAccessApps();
        return { ...result, success: result.success };
    }
    async getAccessApp(id) {
        return await this.cloudflare.getAccessApp(id);
    }
    async createAccessApp(body) {
        const result = await this.cloudflare.createAccessApp(body);
        return { success: result.success, result: result };
    }
    async createAccessPolicy(body) {
        const result = await this.cloudflare.createAccessPolicy(body);
        return { success: result.success, result: result };
    }
    async createPrivateNetwork(body) {
        const result = await this.cloudflare.createPrivateNetwork(body.cidr, body.tunnelId);
        return { success: result.success, result: result };
    }
    async getPrivateNetworks() {
        const result = await this.cloudflare.getPrivateNetworks();
        return { success: result.success, result: result };
    }
    async getAccountMembers(page, per_page) {
        const result = await this.cloudflare.getAccountMembers(page, per_page);
        return { ...result, success: result.success };
    }
    async addAccountMember(body) {
        const result = await this.cloudflare.addAccountMember(body.name, body.email, body.roles);
        return { success: result.success, result: result };
    }
    async importData() {
        const logs = [];
        const originalLog = console.log;
        const originalError = console.error;
        console.log = (...args) => {
            logs.push(args.join(' '));
            originalLog(...args);
        };
        console.error = (...args) => {
            logs.push('ERROR: ' + args.join(' '));
            originalError(...args);
        };
        try {
            const data = await this.cloudflare.importData();
            return { success: true, result: { result: data, logs } };
        }
        catch (e) {
            // Re-throw so the Exception Filter handles it uniformly
            throw e;
        }
        finally {
            console.log = originalLog;
            console.error = originalError;
        }
    }
};
exports.CloudflareController = CloudflareController;
__decorate([
    (0, common_1.Get)('access/groups'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "getAccessGroups", null);
__decorate([
    (0, common_1.Get)('tunnels'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('per_page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "getTunnels", null);
__decorate([
    (0, common_1.Get)('tunnel'),
    __param(0, (0, common_1.Query)('tunnelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "getTunnel", null);
__decorate([
    (0, common_1.Post)('tunnels'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "createTunnel", null);
__decorate([
    (0, common_1.Get)('access/apps'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('per_page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "getAccessApps", null);
__decorate([
    (0, common_1.Get)('access/apps/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "getAccessApp", null);
__decorate([
    (0, common_1.Post)('access/apps'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "createAccessApp", null);
__decorate([
    (0, common_1.Post)('access/policies'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "createAccessPolicy", null);
__decorate([
    (0, common_1.Post)('networks/routes'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "createPrivateNetwork", null);
__decorate([
    (0, common_1.Get)('networks/routes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "getPrivateNetworks", null);
__decorate([
    (0, common_1.Get)('accounts/members'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('per_page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "getAccountMembers", null);
__decorate([
    (0, common_1.Post)('accounts/members'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "addAccountMember", null);
__decorate([
    (0, common_1.Post)('import'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CloudflareController.prototype, "importData", null);
exports.CloudflareController = CloudflareController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('cloudflare'),
    __metadata("design:paramtypes", [cloudflare_service_1.CloudflareService,
        prisma_service_1.PrismaService])
], CloudflareController);
//# sourceMappingURL=cloudflare.controller.js.map