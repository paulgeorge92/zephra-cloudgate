import { Injectable } from '@nestjs/common';
import { CloudflareService } from '../cloudflare/cloudflare.service';

@Injectable()
export class DnsService {
  constructor(private readonly cloudflare: CloudflareService) {}

  async getDnsRecords(zoneId: string, name?: string) {
    return this.cloudflare.getDnsRecords(zoneId, name);
  }

  async create(zoneId: string, name: string, tunnelId: string, comment?: string) {
    return this.cloudflare.createDnsRecord(zoneId, {
      name,
      ttl: 1,
      type: 'CNAME',
      comment,
      content: `${tunnelId}.cfargotunnel.com`,
      proxied: true
    });
  }

  async delete(zoneId: string, recordId: string) {
    return this.cloudflare.deleteDnsRecord(zoneId, recordId);
  }
}
