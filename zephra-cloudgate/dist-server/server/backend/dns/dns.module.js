"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DnsModule = void 0;
const common_1 = require("@nestjs/common");
const dns_service_1 = require("./dns.service");
const dns_controller_1 = require("./dns.controller");
const cloudflare_module_1 = require("../cloudflare/cloudflare.module");
let DnsModule = class DnsModule {
};
exports.DnsModule = DnsModule;
exports.DnsModule = DnsModule = __decorate([
    (0, common_1.Module)({
        imports: [cloudflare_module_1.CloudflareModule],
        controllers: [dns_controller_1.DnsController],
        providers: [dns_service_1.DnsService],
        exports: [dns_service_1.DnsService],
    })
], DnsModule);
//# sourceMappingURL=dns.module.js.map