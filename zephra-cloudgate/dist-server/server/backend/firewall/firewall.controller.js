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
exports.FirewallController = void 0;
const common_1 = require("@nestjs/common");
const firewall_service_1 = require("./firewall.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let FirewallController = class FirewallController {
    firewallService;
    constructor(firewallService) {
        this.firewallService = firewallService;
    }
    async getPolicies() {
        return this.firewallService.getFirewallPolicies();
    }
    async getAppTypes() {
        return this.firewallService.getAppTypes();
    }
    async getCategories() {
        return this.firewallService.getCategories();
    }
    async getUiOptions() {
        return this.firewallService.getUiOptions();
    }
    async getFileTypes() {
        return this.firewallService.getFileTypes();
    }
    async getPolicy(id) {
        return this.firewallService.getFirewallPolicy(id);
    }
    async createPolicy(data) {
        return this.firewallService.createFirewallPolicy(data);
    }
    async deletePolicy(id) {
        return this.firewallService.deleteFirewallPolicy(id);
    }
};
exports.FirewallController = FirewallController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FirewallController.prototype, "getPolicies", null);
__decorate([
    (0, common_1.Get)('app_types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FirewallController.prototype, "getAppTypes", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FirewallController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('ui_options'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FirewallController.prototype, "getUiOptions", null);
__decorate([
    (0, common_1.Get)('dlp/file_types'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FirewallController.prototype, "getFileTypes", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FirewallController.prototype, "getPolicy", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FirewallController.prototype, "createPolicy", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FirewallController.prototype, "deletePolicy", null);
exports.FirewallController = FirewallController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('firewall/policies'),
    __metadata("design:paramtypes", [firewall_service_1.FirewallService])
], FirewallController);
//# sourceMappingURL=firewall.controller.js.map