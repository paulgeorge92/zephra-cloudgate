import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { CreateApplicationData, Application, ApplicationExposureTypeEnum, HealthStatus } from '../shared/types';
import { CloudflareAccessApplication } from '../cloudflare/cloudflare.types';
import { DnsService } from '../dns/dns.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private cloudflare: CloudflareService,
    private dns: DnsService
  ) {}

  private async checkHealth(destinationUrl: string): Promise<HealthStatus> {
    try {
      // Validate URL format
      const url = new URL(destinationUrl);
      
      // Check if protocol is supported (only HTTP/HTTPS)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return {
          status: 'UNSUPPORTED',
          message: 'Protocol not supported. Only HTTP/HTTPS are supported.',
          statusCode: undefined
        };
      }

      // Make a HEAD request with a timeout
      const response = await axios.get(destinationUrl, {
        timeout: 5000,
        validateStatus: () => true // Don't throw on any status code
      });

      // Status codes 200-399 are considered ONLINE
      if (response.status >= 200 && response.status < 400) {
        return {
          status: 'ONLINE',
          message: response.statusText,
          statusCode: response.status
        };
      }
      // Status codes 400+ are considered OFFLINE
      else if (response.status >= 400) {
        return {
          status: 'OFFLINE',
          message: response.statusText,
          statusCode: response.status
        };
      }

      return {
        status: 'UNKNOWN',
        message: 'Unable to determine server health',
        statusCode: response.status
      };
    } catch (error: unknown) {
      // Check if it's a URL parse error or unsupported protocol
      if (error instanceof TypeError && error.message.includes('Invalid URL')) {
        return {
          status: 'UNSUPPORTED',
          message: 'Invalid URL format',
          statusCode: undefined
        };
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Connection errors, timeouts, etc. are considered OFFLINE
      return {
        status: 'OFFLINE',
        message: `Server is not responding: ${errorMessage}`,
        statusCode: undefined
      };
    }
  }

  async findAll(): Promise<Application[]> {
    const apps = await this.prisma.application.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return Promise.all(
      apps.map(async (app): Promise<Application> => {
        const health = await this.checkHealth(app.destinationUrl);
        return {
          id: app.id,
          name: app.name,
          logoUrl: app.logoUrl ?? undefined,
          publicUrl: JSON.parse(app.publicUrl || '[]'),
          destinationType: app.destinationType as Application['destinationType'],
          destinationUrl: app.destinationUrl,
          exposureType: app.exposureType as Application['exposureType'],
          tunnelId: app.tunnelId ?? undefined,
          health,
          createdAt: app.createdAt.toISOString(),
          updatedAt: app.updatedAt.toISOString()
        };
      })
    );
  }

  async get(id: string): Promise<Application> {
    const app = await this.prisma.application.findUniqueOrThrow({
      where: { id }
    });
    
    const health = await this.checkHealth(app.destinationUrl);

    return {
      id: app.id,
      name: app.name,
      logoUrl: app.logoUrl ?? undefined,
      publicUrl: JSON.parse(app.publicUrl || '[]'),
      destinationType: app.destinationType as Application['destinationType'],
      destinationUrl: app.destinationUrl,
      exposureType: app.exposureType as Application['exposureType'],
      tunnelId: app.tunnelId ?? undefined,
      health,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString()
    };
  }

  async create(data: CreateApplicationData): Promise<Application> {
    const { tunnelId, policy, ...rest } = data;
    let dnsRecordId: string | undefined = undefined;
    let accessAppId: string | undefined = undefined;
    try {
      // 1. Create DNS Record and Tunnel Configuration for Public and Public with Access Apps
      if (rest.exposureType !== ApplicationExposureTypeEnum.WARP) {
        const publicUrls = rest.publicUrl as string[];
        const tunnelConfig = await this.cloudflare.getTunnelConfig(tunnelId || '');
        for (const publicUrl of publicUrls) {
          //Create a DNS record if tunnelId is provided
          const dnsRecord = await this.dns.create(rest.zoneId || '', publicUrl || '', tunnelId || '', `DNS record for ${rest.name} Ingress Rule`);
          dnsRecordId = dnsRecord.result.id;

         
          if (tunnelConfig.result.config.ingress.find((i) => i.hostname === rest.publicUrl)) {
            console.log('Tunnel config already has the hostname, skipping update');
          } else {
            tunnelConfig.result.config.ingress.splice(tunnelConfig.result.config.ingress.length - 1, 0, {
              hostname: publicUrl || '',
              service: rest.destinationUrl || ''
            });
           
          }
        }
        await this.cloudflare.updateTunnelConfig(tunnelId || '', tunnelConfig.result.config);
      }

      // 2. Create Access App if WARP or Public with Access
      const appConfig: CloudflareAccessApplication = {
        name: rest.name,
        type: 'self_hosted',
        destinations: [],
        allow_iframe: false,
        app_launcher_visible: true,
        logo_url: rest.logoUrl
      };
      if (rest.exposureType != ApplicationExposureTypeEnum.WARP) {
        appConfig.destinations!.push({
          type: 'public',
          uri: `${rest.publicUrl}`
        });
      } else {
        const ip = rest.destinationUrl.split('://')[1];
        appConfig.destinations!.push({
          type: 'private',
          cidr: ip.split(':')[0],
          port_range: ip.split(':')[1]
        });
        appConfig.allow_authenticate_via_warp = true;
      }

      if (policy && policy.policyId) {
        appConfig.policies = [
          {
            id: policy.policyId
          }
        ];
      }

      const accessApp = await this.cloudflare.createAccessApp(appConfig);
      accessAppId = accessApp.result.id;

      // 3. Save Application to Local Database
      const app = await this.prisma.application.create({
        data: {
          id: accessAppId || undefined,
          name: rest.name,
          logoUrl: rest.logoUrl ?? null,
          publicUrl: JSON.stringify(rest.publicUrl || '[]'),
          destinationType: rest.destinationType,
          destinationUrl: rest.destinationUrl,
          exposureType: rest.exposureType,
          tunnelId: tunnelId || null,
          dnsRecordId: dnsRecordId || null
        }
      });

      const health = await this.checkHealth(app.destinationUrl);

      return {
        id: app.id,
        name: app.name,
        logoUrl: app.logoUrl ?? undefined,
        publicUrl: JSON.parse(app.publicUrl || '[]'),
        destinationType: app.destinationType as Application['destinationType'],
        destinationUrl: app.destinationUrl,
        exposureType: app.exposureType as Application['exposureType'],
        tunnelId: app.tunnelId ?? undefined,
        health,
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString()
      };
    } catch (e: unknown) {
      // rollback DNS in case of any failure during the creation process
      if (dnsRecordId) {
        await this.dns.delete(rest.zoneId!, dnsRecordId);
      }

      //rollback Tunnel config in case of any failure during the creation process
      if (tunnelId && rest.exposureType != ApplicationExposureTypeEnum.WARP) {
        const tunnelConfig = await this.cloudflare.getTunnelConfig(tunnelId);
        tunnelConfig.result.config.ingress = tunnelConfig.result.config.ingress.filter((i) => i.hostname !== rest.publicUrl);
        await this.cloudflare.updateTunnelConfig(tunnelId, tunnelConfig.result.config);
      }

      // rollback Access App in case of any failure during the creation process
      if (accessAppId) {
        await this.cloudflare.deleteAccessApp(accessAppId);
      }
      console.error('ApplicationsService.create Error:', e);
      throw e;
    }
  }

  async update(id: string, data: Partial<CreateApplicationData>): Promise<Application> {
    const { tunnelId, ...rest } = data;
    const app = await this.prisma.application.update({
      where: { id },
      data: {
        name: rest.name,
        logoUrl: rest.logoUrl,
        publicUrl: JSON.stringify(rest.publicUrl),
        destinationType: rest.destinationType,
        destinationUrl: rest.destinationUrl,
        exposureType: rest.exposureType,
        tunnelId: tunnelId || undefined
      }
    });
    
    const health = await this.checkHealth(app.destinationUrl);
    
    return {
      id: app.id,
      name: app.name,
      logoUrl: app.logoUrl ?? undefined,
      publicUrl: JSON.parse(app.publicUrl || '[]'),
      destinationType: app.destinationType as Application['destinationType'],
      destinationUrl: app.destinationUrl,
      exposureType: app.exposureType as Application['exposureType'],
      tunnelId: app.tunnelId ?? undefined,
      health,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString()
    };
  }

  async delete(id: string): Promise<{ id: string }> {
    await this.prisma.application.delete({ where: { id } });
    //Add delete ops from cloudflare well
    return { id };
  }
}
