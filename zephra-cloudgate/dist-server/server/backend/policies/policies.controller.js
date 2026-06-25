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
exports.PoliciesController = void 0;
const common_1 = require("@nestjs/common");
const policies_service_1 = require("./policies.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let PoliciesController = class PoliciesController {
    policiesService;
    constructor(policiesService) {
        this.policiesService = policiesService;
    }
    async findAll(page, per_page) {
        const result = await this.policiesService.findAll(page, per_page);
        return { ...result, success: true };
    }
    async findOne(id) {
        const result = await this.policiesService.findOne(id);
        return { ...result };
    }
    async getApps(id) {
        const res = await this.policiesService.getAppsUsingPolicy(id);
        const result = res.result.map((app) => ({
            id: app.id || '',
            created_at: app.created_at || new Date().toISOString(),
            custom_deny_url: app.custom_deny_url,
            custom_non_identity_deny_url: app.custom_non_identity_deny_url,
            domain: app.domain || '',
            logo_url: app.logo_url || '',
            name: app.name,
            policies: app.policies?.map((policy) => ({
                id: policy.id,
                name: policy.name,
                account_id: policy.account_id,
                decision: policy.decision,
                app_count: policy.app_count,
                approval_groups: policy.approval_groups,
                approval_required: policy.approval_required,
                include: policy.include,
                exclude: policy.exclude,
                require: policy.require,
                created_at: policy.created_at || new Date().toISOString(),
                updated_at: policy.updated_at || new Date().toISOString(),
                connection_rules: policy.connection_rules
            })) || [],
            session_duration: app.session_duration || '',
            type: app.type || '',
            updated_at: app.updated_at || new Date().toISOString()
        }));
        return { ...res, result };
    }
    async delete(id) {
        const result = await this.policiesService.delete(id);
        return { ...result };
    }
};
exports.PoliciesController = PoliciesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('per_page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], PoliciesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PoliciesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/apps'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PoliciesController.prototype, "getApps", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PoliciesController.prototype, "delete", null);
exports.PoliciesController = PoliciesController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('policies'),
    __metadata("design:paramtypes", [policies_service_1.PoliciesService])
], PoliciesController);
//# sourceMappingURL=policies.controller.js.map