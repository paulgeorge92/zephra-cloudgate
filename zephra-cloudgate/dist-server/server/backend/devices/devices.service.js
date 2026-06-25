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
exports.DevicesService = void 0;
const common_1 = require("@nestjs/common");
const cloudflare_service_1 = require("../cloudflare/cloudflare.service");
let DevicesService = class DevicesService {
    cloudflare;
    constructor(cloudflare) {
        this.cloudflare = cloudflare;
    }
    async findAll() {
        try {
            const res = await this.cloudflare.getDevices();
            const cfDevices = res.result || [];
            const mapped = cfDevices.map((cf) => ({
                id: cf.id,
                active_registrations: cf.active_registrations,
                last_seen_at: cf.last_seen_at || new Date().toISOString(),
                name: cf.name,
                user: cf.user,
                client_version: cf.client_version,
                device_type: cf.device_type,
                model: cf.model || 'Unknown',
                manufacturer: cf.manufacturer,
                mac_address: cf.mac_address,
                os_version: cf.os_version,
                os_version_extra: cf.os_version_extra
            }));
            return {
                result: mapped,
                result_info: res?.result_info,
                success: res?.success || false,
                errors: res?.errors || [],
                messages: res?.messages || [],
            };
        }
        catch (error) {
            console.error('Error in DevicesService.findAll:', error);
            return { result: [], success: false, errors: [{ code: 500, message: error.message || 'An error occurred while fetching devices' }], messages: [] };
        }
    }
    async getPostureRules() {
        return this.cloudflare.getDevicePostureRules();
    }
};
exports.DevicesService = DevicesService;
exports.DevicesService = DevicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cloudflare_service_1.CloudflareService])
], DevicesService);
//# sourceMappingURL=devices.service.js.map