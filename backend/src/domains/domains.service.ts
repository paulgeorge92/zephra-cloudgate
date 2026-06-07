import { Injectable } from '@nestjs/common';
import { CloudflareService } from '../cloudflare/cloudflare.service';

@Injectable()
export class DomainsService {
  constructor(private readonly cloudflare: CloudflareService) {}

  async findAll() {
    return this.cloudflare.getZones();
  }
}
