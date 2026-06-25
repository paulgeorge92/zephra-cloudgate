"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TunnelsModule = void 0;
const common_1 = require("@nestjs/common");
const tunnels_service_1 = require("./tunnels.service");
const tunnels_controller_1 = require("./tunnels.controller");
const cloudflare_module_1 = require("../cloudflare/cloudflare.module");
let TunnelsModule = class TunnelsModule {
};
exports.TunnelsModule = TunnelsModule;
exports.TunnelsModule = TunnelsModule = __decorate([
    (0, common_1.Module)({
        imports: [cloudflare_module_1.CloudflareModule],
        controllers: [tunnels_controller_1.TunnelsController],
        providers: [tunnels_service_1.TunnelsService],
    })
], TunnelsModule);
//# sourceMappingURL=tunnels.module.js.map