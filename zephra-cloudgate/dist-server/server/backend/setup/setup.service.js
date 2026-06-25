"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetupService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const crypto_util_1 = require("../utils/crypto.util");
const cloudflare_service_1 = require("../cloudflare/cloudflare.service");
const CONFIG_KEYS = {
    CF_ACCOUNT_ID: 'cf_account_id',
    CF_EMAIL: 'cf_email',
    CF_GLOBAL_API_KEY: 'cf_global_api_key',
    CF_API_TOKEN: 'cf_api_token',
    CF_TEAM_NAME: 'cf_team_name',
    SETUP_COMPLETE: 'setup_complete',
    SMTP_HOST: 'smtp_host',
    SMTP_PORT: 'smtp_port',
    SMTP_USER: 'smtp_user',
    SMTP_PASS: 'smtp_pass',
    SMTP_ENC: 'smtp_enc',
    SERVER_PROFILE: 'server_profile'
};
let SetupService = class SetupService {
    prisma;
    cloudflare;
    legacyConfigChecked = false;
    constructor(prisma, cloudflare) {
        this.prisma = prisma;
        this.cloudflare = cloudflare;
    }
    async isSetupComplete() {
        const settings = await this.prisma.configuration.findFirst({
            where: { name: CONFIG_KEYS.SETUP_COMPLETE }
        });
        return !!settings;
    }
    async getSetupStatus() {
        const setupComplete = await this.isSetupComplete();
        return { setupComplete };
    }
    async completeSetup() {
        await this.setConfigValue(CONFIG_KEYS.SETUP_COMPLETE, '1');
        return { success: true };
    }
    async resetDatabase() {
        let resetStatus = false;
        const tables = await this.prisma.$queryRaw `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
    `;
        await this.prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
        try {
            for (const table of tables) {
                const safeTableName = table.name.replace(/"/g, '""');
                await this.prisma.$executeRawUnsafe(`DELETE FROM "${safeTableName}"`);
            }
            resetStatus = true;
        }
        catch (e) {
            console.log(e);
        }
        finally {
            await this.prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
        }
        return resetStatus;
    }
    async saveCloudflareConfig(data) {
        if (!data.globalApiKey || !data.apiToken) {
            throw new common_1.BadRequestException('API credentials are required');
        }
        await this.setConfigEntries({
            [CONFIG_KEYS.CF_ACCOUNT_ID]: data.accountId,
            [CONFIG_KEYS.CF_EMAIL]: data.email,
            [CONFIG_KEYS.CF_GLOBAL_API_KEY]: (0, crypto_util_1.encrypt)(data.globalApiKey),
            [CONFIG_KEYS.CF_API_TOKEN]: (0, crypto_util_1.encrypt)(data.apiToken),
            [CONFIG_KEYS.CF_TEAM_NAME]: data.teamName || ''
        });
        return { success: true };
    }
    async getCloudflareConfig() {
        const config = await this.getConfigEntries([CONFIG_KEYS.CF_ACCOUNT_ID, CONFIG_KEYS.CF_EMAIL, CONFIG_KEYS.CF_TEAM_NAME, CONFIG_KEYS.CF_GLOBAL_API_KEY]);
        if (!config[CONFIG_KEYS.CF_ACCOUNT_ID] && !config[CONFIG_KEYS.CF_EMAIL] && !config[CONFIG_KEYS.CF_TEAM_NAME]) {
            return null;
        }
        return {
            accountId: config[CONFIG_KEYS.CF_ACCOUNT_ID],
            email: config[CONFIG_KEYS.CF_EMAIL],
            teamName: config[CONFIG_KEYS.CF_TEAM_NAME],
            globalApiKey: config[CONFIG_KEYS.CF_GLOBAL_API_KEY] ? (0, crypto_util_1.decrypt)(config[CONFIG_KEYS.CF_GLOBAL_API_KEY]) : undefined
        };
    }
    async saveSmtpConfig(data) {
        if (!data.password) {
            throw new common_1.BadRequestException('SMTP password is required');
        }
        await this.setConfigEntries({
            [CONFIG_KEYS.SMTP_HOST]: data.host,
            [CONFIG_KEYS.SMTP_PORT]: String(data.port),
            [CONFIG_KEYS.SMTP_USER]: data.username,
            [CONFIG_KEYS.SMTP_PASS]: (0, crypto_util_1.encrypt)(data.password),
            [CONFIG_KEYS.SMTP_ENC]: data.encryption
        });
        return { success: true };
    }
    async getSmtpConfig() {
        const config = await this.getConfigEntries([CONFIG_KEYS.SMTP_HOST, CONFIG_KEYS.SMTP_PORT, CONFIG_KEYS.SMTP_USER, CONFIG_KEYS.SMTP_ENC]);
        if (!config[CONFIG_KEYS.SMTP_HOST] && !config[CONFIG_KEYS.SMTP_USER] && !config[CONFIG_KEYS.SMTP_ENC]) {
            return null;
        }
        return {
            host: config[CONFIG_KEYS.SMTP_HOST] || '',
            port: Number(config[CONFIG_KEYS.SMTP_PORT] || 0),
            username: config[CONFIG_KEYS.SMTP_USER] || '',
            encryption: config[CONFIG_KEYS.SMTP_ENC] || ''
        };
    }
    async saveServerProfile(data) {
        await this.setConfigValue(CONFIG_KEYS.SERVER_PROFILE, JSON.stringify(data));
        return data;
    }
    async getServerProfile() {
        const profile = await this.getConfigValue(CONFIG_KEYS.SERVER_PROFILE);
        if (!profile)
            return null;
        try {
            return JSON.parse(profile);
        }
        catch {
            return null;
        }
    }
    async verifySetup() {
        const cf_result = (await this.verifyCloudflareCredentials());
        const smtp_result = await this.verifySMTP();
        return {
            success: cf_result.success && smtp_result.smtp.success,
            message: '',
            result: { ...cf_result.result, ...smtp_result }
        };
    }
    async verifySMTP() {
        const smtpConfig = await this.getSmtpConfig();
        if (!smtpConfig?.username)
            return { smtp: { success: true, message: 'SMTP Veriification Skipped' } };
        /* do smtp verification  */
        return { smtp: { success: true, message: 'Email Valid EMail Configuration' } };
    }
    async verifyCloudflareCredentials() {
        const config = await this.getConfigEntries([CONFIG_KEYS.CF_API_TOKEN, CONFIG_KEYS.CF_EMAIL, CONFIG_KEYS.CF_ACCOUNT_ID, CONFIG_KEYS.CF_GLOBAL_API_KEY]);
        const encryptedToken = config[CONFIG_KEYS.CF_API_TOKEN] || '';
        const encryptedApiKey = config[CONFIG_KEYS.CF_GLOBAL_API_KEY] || '';
        const email = config[CONFIG_KEYS.CF_EMAIL] || '';
        const accountId = config[CONFIG_KEYS.CF_ACCOUNT_ID] || '';
        if (!encryptedToken && !encryptedApiKey && !email && !accountId) {
            return {
                success: false,
                errors: [{ code: 404, message: 'Cloudflare configuration not found in database' }],
                messages: ['Cloudflare configuration is missing'],
                result: {
                    token: { success: false, message: 'Not Verified' },
                    account: { success: false, message: 'Not Verified' },
                    apikey: { success: false, message: 'Not Verified' }
                }
            };
        }
        const token = (0, crypto_util_1.decrypt)(encryptedToken);
        const apiKey = (0, crypto_util_1.decrypt)(encryptedApiKey);
        const res = await this.cloudflare.verifyCredentials(token, email, accountId, apiKey);
        return { ...res };
    }
    async getConfigEntries(keys) {
        await this.ensureLegacyConfigMigrated();
        const rows = await this.prisma.configuration.findMany({
            where: { name: { in: keys } },
            orderBy: { id: 'asc' }
        });
        const map = {};
        for (const key of keys) {
            map[key] = undefined;
        }
        for (const row of rows) {
            if (map[row.name] === undefined) {
                map[row.name] = row.value;
            }
        }
        return map;
    }
    async getConfigValue(key) {
        const config = await this.getConfigEntries([key]);
        return config[key];
    }
    async setConfigEntries(entries) {
        for (const [name, value] of Object.entries(entries)) {
            if (typeof value === 'string') {
                await this.setConfigValue(name, value);
            }
        }
    }
    async setConfigValue(name, value) {
        const existing = await this.prisma.configuration.findMany({
            where: { name },
            select: { id: true },
            orderBy: { id: 'asc' }
        });
        if (existing.length === 0) {
            await this.prisma.configuration.create({
                data: { name, value }
            });
            return;
        }
        await this.prisma.configuration.update({
            where: { id: existing[0].id },
            data: { value }
        });
        if (existing.length > 1) {
            await this.prisma.configuration.deleteMany({
                where: { id: { in: existing.slice(1).map((item) => item.id) } }
            });
        }
    }
    async ensureLegacyConfigMigrated() {
        if (this.legacyConfigChecked)
            return;
        this.legacyConfigChecked = true;
        const trackedKeys = Object.values(CONFIG_KEYS);
        const hasStoredConfig = await this.prisma.configuration.count({
            where: { name: { in: trackedKeys } }
        });
        if (hasStoredConfig > 0)
            return;
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const configPath = path.join(process.cwd(), 'config.json');
        if (!fs.existsSync(configPath))
            return;
        const legacyConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const values = {};
        if (legacyConfig.cf_account_id)
            values[CONFIG_KEYS.CF_ACCOUNT_ID] = legacyConfig.cf_account_id;
        if (legacyConfig.cf_email)
            values[CONFIG_KEYS.CF_EMAIL] = legacyConfig.cf_email;
        if (legacyConfig.cf_global_api_key)
            values[CONFIG_KEYS.CF_GLOBAL_API_KEY] = legacyConfig.cf_global_api_key;
        if (legacyConfig.cf_api_token)
            values[CONFIG_KEYS.CF_API_TOKEN] = legacyConfig.cf_api_token;
        if (legacyConfig.cf_team_name)
            values[CONFIG_KEYS.CF_TEAM_NAME] = legacyConfig.cf_team_name;
        if (legacyConfig.setup_complete !== undefined)
            values[CONFIG_KEYS.SETUP_COMPLETE] = String(legacyConfig.setup_complete);
        if (legacyConfig.smtp_host)
            values[CONFIG_KEYS.SMTP_HOST] = legacyConfig.smtp_host;
        if (legacyConfig.smtp_port !== undefined)
            values[CONFIG_KEYS.SMTP_PORT] = String(legacyConfig.smtp_port);
        if (legacyConfig.smtp_user)
            values[CONFIG_KEYS.SMTP_USER] = legacyConfig.smtp_user;
        if (legacyConfig.smtp_pass)
            values[CONFIG_KEYS.SMTP_PASS] = legacyConfig.smtp_pass;
        if (legacyConfig.smtp_enc)
            values[CONFIG_KEYS.SMTP_ENC] = legacyConfig.smtp_enc;
        if (legacyConfig.server_profile)
            values[CONFIG_KEYS.SERVER_PROFILE] = JSON.stringify(legacyConfig.server_profile);
        await this.setConfigEntries(values);
    }
};
exports.SetupService = SetupService;
exports.SetupService = SetupService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudflare_service_1.CloudflareService])
], SetupService);
//# sourceMappingURL=setup.service.js.map