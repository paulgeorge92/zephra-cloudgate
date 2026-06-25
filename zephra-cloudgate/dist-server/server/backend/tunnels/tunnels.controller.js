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
exports.TunnelsController = void 0;
const common_1 = require("@nestjs/common");
const tunnels_service_1 = require("./tunnels.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let TunnelsController = class TunnelsController {
    tunnels;
    constructor(tunnels) {
        this.tunnels = tunnels;
    }
    async findAll(page, per_page) {
        const response = await this.tunnels.findAll(page, per_page);
        return { ...response, success: true };
    }
    async getDetail(id) {
        const result = await this.tunnels.getDetail(id);
        return { success: true, result: result };
    }
    async findOne(id) {
        const result = await this.tunnels.findOne(id);
        return { success: true, result: result };
    }
    async getStatus(id) {
        const result = await this.tunnels.getStatus(id);
        return { success: true, result: result };
    }
    async getToken(id) {
        const result = await this.tunnels.getToken(id);
        return { success: true, result: result };
    }
    async create(body) {
        const result = await this.tunnels.create(body.name);
        return { success: true, result: result };
    }
    async update(id, body) {
        const result = await this.tunnels.update(id, body.name);
        return { success: true, result: result };
    }
    async manageRoutes(id, body) {
        const result = await this.tunnels.manageRoutes(id, body.action, body.cidr, body.routeId);
        return { success: true, result: result };
    }
    async manageConfig(id, body) {
        const result = await this.tunnels.manageConfig(id, body.ingressRules);
        return { success: true, result: result };
    }
    async delete(id) {
        const result = await this.tunnels.delete(id);
        return { success: true, result: result };
    }
};
exports.TunnelsController = TunnelsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('per_page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], TunnelsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id/detail'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TunnelsController.prototype, "getDetail", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TunnelsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/status'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TunnelsController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)(':id/token'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TunnelsController.prototype, "getToken", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TunnelsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TunnelsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/routes'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TunnelsController.prototype, "manageRoutes", null);
__decorate([
    (0, common_1.Post)(':id/config'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TunnelsController.prototype, "manageConfig", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TunnelsController.prototype, "delete", null);
exports.TunnelsController = TunnelsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('tunnels'),
    __metadata("design:paramtypes", [tunnels_service_1.TunnelsService])
], TunnelsController);
//# sourceMappingURL=tunnels.controller.js.map