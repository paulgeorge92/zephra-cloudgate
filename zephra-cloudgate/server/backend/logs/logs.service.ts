import { Injectable } from '@nestjs/common';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { CloudflareTrafficLog, CloudflareDNSLog, CloudflareNetworkLog, CloudflareHTTPLog } from '../cloudflare/cloudflare.types';

@Injectable()
export class LogsService {
  constructor(private readonly cloudflareService: CloudflareService) {}

  async getDNSLogs(query: string) {
    return this.cloudflareService.getDNSLogs(query);
  }

  async getNetworkLogs(query: string) {
    return this.cloudflareService.getNetworkLogs(query);
  }

  async getHTTPLogs(query: string) {
    return this.cloudflareService.getHTTPLogs(query);
  }
}