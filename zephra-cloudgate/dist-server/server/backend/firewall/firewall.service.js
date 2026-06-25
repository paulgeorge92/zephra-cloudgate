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
exports.FirewallService = void 0;
const common_1 = require("@nestjs/common");
const cloudflare_service_1 = require("../cloudflare/cloudflare.service");
let FirewallService = class FirewallService {
    cloudflareService;
    constructor(cloudflareService) {
        this.cloudflareService = cloudflareService;
    }
    async getFirewallPolicies() {
        try {
            const response = await this.cloudflareService.getGatewayRules();
            const rules = response.result || [];
            const policies = rules.map(rule => this.mapToFirewallPolicy(rule));
            return {
                success: response.success,
                result: policies,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    async getFirewallPolicy(id) {
        try {
            const response = await this.cloudflareService.getGatewayRule(id);
            if (!response.result) {
                return { success: false, message: 'Policy not found' };
            }
            return {
                success: response.success,
                result: this.mapToFirewallPolicy(response.result),
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    async createFirewallPolicy(data) {
        try {
            const payload = {
                name: data.name,
                description: data.description,
                action: data.action?.toLowerCase(),
                enabled: data.enabled ?? true,
                precedence: data.precedence,
                traffic: data.traffic,
                filters: this.mapTypeToFilters(data.type),
                rule_settings: data.rule_settings,
            };
            const response = await this.cloudflareService.createGatewayRule(payload);
            return {
                success: response.success,
                result: this.mapToFirewallPolicy(response.result),
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    async deleteFirewallPolicy(id) {
        try {
            await this.cloudflareService.deleteGatewayRule(id);
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    async getAppTypes() {
        try {
            const response = await this.cloudflareService.getGatewayAppTypes();
            return {
                success: response.success,
                result: response.result,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    async getCategories() {
        try {
            const response = await this.cloudflareService.getContentCategories();
            return {
                success: response.success,
                result: response.result,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    async getUiOptions() {
        try {
            const response = await this.cloudflareService.getGatewayUiOptions();
            return {
                success: response.success,
                result: response.result,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    async getFileTypes() {
        try {
            const response = await this.cloudflareService.getDlpFileTypes();
            return {
                success: response.success,
                result: response.result,
            };
        }
        catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
    mapToFirewallPolicy(rule) {
        return {
            id: rule.id || '',
            name: rule.name,
            description: rule.description,
            action: rule.action.toUpperCase(),
            enabled: rule.enabled,
            traffic: rule.traffic,
            type: this.mapFiltersToType(rule.filters),
            identity: rule.identity,
            rule_settings: rule.rule_settings,
            filters: rule.filters,
            created_at: rule.created_at,
            updated_at: rule.updated_at,
            precedence: rule.precedence || 0,
        };
    }
    mapFiltersToType(filters) {
        if (!filters || filters.length === 0)
            return 'NETWORK';
        if (filters.includes('dns'))
            return 'DNS';
        if (filters.includes('http'))
            return 'HTTP';
        return 'NETWORK';
    }
    mapTypeToFilters(type) {
        switch (type?.toUpperCase()) {
            case 'DNS': return ['dns'];
            case 'HTTP': return ['http'];
            case 'NETWORK': return ['l4'];
            default: return ['l4'];
        }
    }
};
exports.FirewallService = FirewallService;
exports.FirewallService = FirewallService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cloudflare_service_1.CloudflareService])
], FirewallService);
//# sourceMappingURL=firewall.service.js.map