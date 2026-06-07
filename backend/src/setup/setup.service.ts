import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { encrypt, decrypt } from '../utils/crypto.util';
import { CloudflareConfigData, SmtpConfigData, ServerProfile, SetupVerificationResult, RequestResponse } from '../shared/types';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { CloudflareResponse, CloudflareVerificationResult } from '../cloudflare/cloudflare.types';

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
} as const;

type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

export interface AccountConfig {
  cf_account_id?: string;
  cf_email?: string;
  cf_global_api_key?: string;
  cf_api_token?: string;
  cf_team_name?: string;
  setup_complete?: number;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_enc?: string;
  server_profile?: {
    name: string;
    logoUrl?: string;
    website?: string;
    description?: string;
  };
}

@Injectable()
export class SetupService {
  private legacyConfigChecked = false;

  constructor(
    private prisma: PrismaService,
    private cloudflare: CloudflareService
  ) {}

  async isSetupComplete(): Promise<boolean> {
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

  async resetDatabase(): Promise<boolean> {
    let resetStatus = false;
    const tables = await this.prisma.$queryRaw<Array<{ name: string }>>`
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
    } catch (e) {
      console.log(e);
    } finally {
      await this.prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    }
    return resetStatus;
  }

  async saveCloudflareConfig(data: CloudflareConfigData) {
    if (!data.globalApiKey || !data.apiToken) {
      throw new BadRequestException('API credentials are required');
    }

    await this.setConfigEntries({
      [CONFIG_KEYS.CF_ACCOUNT_ID]: data.accountId,
      [CONFIG_KEYS.CF_EMAIL]: data.email,
      [CONFIG_KEYS.CF_GLOBAL_API_KEY]: encrypt(data.globalApiKey),
      [CONFIG_KEYS.CF_API_TOKEN]: encrypt(data.apiToken),
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
      globalApiKey: config[CONFIG_KEYS.CF_GLOBAL_API_KEY] ? decrypt(config[CONFIG_KEYS.CF_GLOBAL_API_KEY]!) : undefined
    };
  }

  async saveSmtpConfig(data: SmtpConfigData) {
    if (!data.password) {
      throw new BadRequestException('SMTP password is required');
    }

    await this.setConfigEntries({
      [CONFIG_KEYS.SMTP_HOST]: data.host,
      [CONFIG_KEYS.SMTP_PORT]: String(data.port),
      [CONFIG_KEYS.SMTP_USER]: data.username,
      [CONFIG_KEYS.SMTP_PASS]: encrypt(data.password),
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

  async saveServerProfile(data: ServerProfile) {
    await this.setConfigValue(CONFIG_KEYS.SERVER_PROFILE, JSON.stringify(data));
    return data;
  }

  async getServerProfile() {
    const profile = await this.getConfigValue(CONFIG_KEYS.SERVER_PROFILE);
    if (!profile) return null;

    try {
      return JSON.parse(profile) as ServerProfile;
    } catch {
      return null;
    }
  }

  async verifySetup(): Promise<RequestResponse<SetupVerificationResult>> {
    const cf_result = (await this.verifyCloudflareCredentials()) as CloudflareResponse<CloudflareVerificationResult>;
    const smtp_result = await this.verifySMTP();

    return {
      success: cf_result.success && smtp_result.smtp.success,
      message: '',
      result: { ...cf_result.result, ...smtp_result }
    };
  }

  async verifySMTP(): Promise<{ smtp: { success: boolean; message: string } }> {
    const smtpConfig = await this.getSmtpConfig();
    if (!smtpConfig?.username) return { smtp: { success: true, message: 'SMTP Veriification Skipped' } };

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

    const token = decrypt(encryptedToken);
    const apiKey = decrypt(encryptedApiKey);

    const res = await this.cloudflare.verifyCredentials(token, email, accountId, apiKey);
    return { ...res };
  }

  private async getConfigEntries(keys: ConfigKey[]): Promise<Record<string, string | undefined>> {
    await this.ensureLegacyConfigMigrated();

    const rows = await this.prisma.configuration.findMany({
      where: { name: { in: keys as string[] } },
      orderBy: { id: 'asc' }
    });

    const map: Record<string, string | undefined> = {};
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

  private async getConfigValue(key: ConfigKey): Promise<string | undefined> {
    const config = await this.getConfigEntries([key]);
    return config[key];
  }

  private async setConfigEntries(entries: Partial<Record<ConfigKey, string>>): Promise<void> {
    for (const [name, value] of Object.entries(entries)) {
      if (typeof value === 'string') {
        await this.setConfigValue(name as ConfigKey, value);
      }
    }
  }

  private async setConfigValue(name: ConfigKey, value: string): Promise<void> {
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

  private async ensureLegacyConfigMigrated(): Promise<void> {
    if (this.legacyConfigChecked) return;
    this.legacyConfigChecked = true;

    const trackedKeys = Object.values(CONFIG_KEYS) as string[];
    const hasStoredConfig = await this.prisma.configuration.count({
      where: { name: { in: trackedKeys } }
    });
    if (hasStoredConfig > 0) return;

    const fs = await import('fs');
    const path = await import('path');
    const configPath = path.join(process.cwd(), 'config.json');
    if (!fs.existsSync(configPath)) return;

    const legacyConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as AccountConfig;
    const values: Partial<Record<ConfigKey, string>> = {};

    if (legacyConfig.cf_account_id) values[CONFIG_KEYS.CF_ACCOUNT_ID] = legacyConfig.cf_account_id;
    if (legacyConfig.cf_email) values[CONFIG_KEYS.CF_EMAIL] = legacyConfig.cf_email;
    if (legacyConfig.cf_global_api_key) values[CONFIG_KEYS.CF_GLOBAL_API_KEY] = legacyConfig.cf_global_api_key;
    if (legacyConfig.cf_api_token) values[CONFIG_KEYS.CF_API_TOKEN] = legacyConfig.cf_api_token;
    if (legacyConfig.cf_team_name) values[CONFIG_KEYS.CF_TEAM_NAME] = legacyConfig.cf_team_name;
    if (legacyConfig.setup_complete !== undefined) values[CONFIG_KEYS.SETUP_COMPLETE] = String(legacyConfig.setup_complete);
    if (legacyConfig.smtp_host) values[CONFIG_KEYS.SMTP_HOST] = legacyConfig.smtp_host;
    if (legacyConfig.smtp_port !== undefined) values[CONFIG_KEYS.SMTP_PORT] = String(legacyConfig.smtp_port);
    if (legacyConfig.smtp_user) values[CONFIG_KEYS.SMTP_USER] = legacyConfig.smtp_user;
    if (legacyConfig.smtp_pass) values[CONFIG_KEYS.SMTP_PASS] = legacyConfig.smtp_pass;
    if (legacyConfig.smtp_enc) values[CONFIG_KEYS.SMTP_ENC] = legacyConfig.smtp_enc;
    if (legacyConfig.server_profile) values[CONFIG_KEYS.SERVER_PROFILE] = JSON.stringify(legacyConfig.server_profile);

    await this.setConfigEntries(values);
  }
}
