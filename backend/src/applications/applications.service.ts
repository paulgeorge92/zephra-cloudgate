import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { CreateApplicationData, Application, ApplicationExposureTypeEnum } from '../shared/types';
import { CloudflareAccessApplication } from '../cloudflare/cloudflare.types';
import { DnsService } from '../dns/dns.service';

@Injectable()
export class ApplicationsService {
  constructor(
    private prisma: PrismaService,
    private cloudflare: CloudflareService,
    private dns: DnsService
  ) {}

  async findAll(): Promise<Application[]> {
    const apps = await this.prisma.application.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return apps.map(
      (app): Application => ({
        id: app.id,
        name: app.name,
        logoUrl: app.logoUrl ?? undefined,
        publicUrl: app.publicUrl ?? undefined,
        destinationType: app.destinationType as Application['destinationType'],
        destinationUrl: app.destinationUrl,
        exposureType: app.exposureType as Application['exposureType'],
        tunnelId: app.tunnelId ?? undefined,
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString()
      })
    );
  }

  async findOne(id: string): Promise<Application> {
    const app = await this.prisma.application.findUniqueOrThrow({
      where: { id }
    });
    return {
      id: app.id,
      name: app.name,
      logoUrl: app.logoUrl ?? undefined,
      publicUrl: app.publicUrl ?? undefined,
      destinationType: app.destinationType as Application['destinationType'],
      destinationUrl: app.destinationUrl,
      exposureType: app.exposureType as Application['exposureType'],
      tunnelId: app.tunnelId ?? undefined,
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
        //Create a DNS record if tunnelId is provided
        const dnsRecord = await this.dns.create(rest.zoneId || '', rest.publicUrl || '', tunnelId || '', `DNS record for ${rest.name} Ingress Rule`);
        dnsRecordId = dnsRecord.result.id;

        let tunnelConfig = await this.cloudflare.getTunnelConfig(tunnelId || '');
        if (tunnelConfig.result.config.ingress.find((i) => i.hostname === rest.publicUrl)) {
          console.log('Tunnel config already has the hostname, skipping update');
        } else {
          tunnelConfig.result.config.ingress.splice(tunnelConfig.result.config.ingress.length - 1, 0, {
            hostname: rest.publicUrl || '',
            service: rest.destinationUrl || ''
          });
          await this.cloudflare.updateTunnelConfig(tunnelId || '', tunnelConfig.result.config);
        }
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
          publicUrl: rest.publicUrl ?? null,
          destinationType: rest.destinationType,
          destinationUrl: rest.destinationUrl,
          exposureType: rest.exposureType,
          tunnelId: tunnelId || null,
          dnsRecordId: dnsRecordId || null
        }
      });

      return {
        id: app.id,
        name: app.name,
        logoUrl: app.logoUrl ?? undefined,
        publicUrl: app.publicUrl ?? undefined,
        destinationType: app.destinationType as Application['destinationType'],
        destinationUrl: app.destinationUrl,
        exposureType: app.exposureType as Application['exposureType'],
        tunnelId: app.tunnelId ?? undefined,
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
        let tunnelConfig = await this.cloudflare.getTunnelConfig(tunnelId);
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
        publicUrl: rest.publicUrl,
        destinationType: rest.destinationType,
        destinationUrl: rest.destinationUrl,
        exposureType: rest.exposureType,
        tunnelId: tunnelId || undefined
      }
    });
    return {
      id: app.id,
      name: app.name,
      logoUrl: app.logoUrl ?? undefined,
      publicUrl: app.publicUrl ?? undefined,
      destinationType: app.destinationType as Application['destinationType'],
      destinationUrl: app.destinationUrl,
      exposureType: app.exposureType as Application['exposureType'],
      tunnelId: app.tunnelId ?? undefined,
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString()
    };
  }

  async delete(id: string): Promise<{ id: string }> {
    await this.prisma.application.delete({ where: { id } });
    return { id };
  }
}
