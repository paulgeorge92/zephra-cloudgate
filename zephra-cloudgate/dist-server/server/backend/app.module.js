"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma.module");
const auth_module_1 = require("./auth/auth.module");
const setup_module_1 = require("./setup/setup.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
const applications_module_1 = require("./applications/applications.module");
const tunnels_module_1 = require("./tunnels/tunnels.module");
const users_module_1 = require("./users/users.module");
const cloudflare_module_1 = require("./cloudflare/cloudflare.module");
const devices_module_1 = require("./devices/devices.module");
const policies_module_1 = require("./policies/policies.module");
const lists_module_1 = require("./lists/lists.module");
const domains_module_1 = require("./domains/domains.module");
const dns_module_1 = require("./dns/dns.module");
const firewall_module_1 = require("./firewall/firewall.module");
const logs_module_1 = require("./logs/logs.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env', '../.env', '../../.env'],
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            setup_module_1.SetupModule,
            dashboard_module_1.DashboardModule,
            applications_module_1.ApplicationsModule,
            tunnels_module_1.TunnelsModule,
            users_module_1.UsersModule,
            cloudflare_module_1.CloudflareModule,
            devices_module_1.DevicesModule,
            policies_module_1.PoliciesModule,
            lists_module_1.ListsModule,
            domains_module_1.DomainsModule,
            dns_module_1.DnsModule,
            firewall_module_1.FirewallModule,
            logs_module_1.LogsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map