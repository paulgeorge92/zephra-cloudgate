import { Injectable } from '@nestjs/common';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { CloudflareAccessApplication, CloudflareResponse } from 'src/cloudflare/cloudflare.types';

@Injectable()
export class PoliciesService {
  constructor(private readonly cloudflare: CloudflareService) {}

  async findAll(page?: number, per_page?: number) {
    return this.cloudflare.getAccessPolicies(page, per_page);
  }

  async findOne(id: string) {
    return this.cloudflare.getAccessPolicy(id);
  }

  async delete(id: string) {
    return this.cloudflare.deleteAccessPolicy(id);
  }

  async getAppsUsingPolicy(id: string): Promise<CloudflareResponse<CloudflareAccessApplication[]>> {
    let res = await this.cloudflare.getApps();
    try {
      const apps = res.result.filter((app) => app.policies?.some((policy) => policy.id == id));
      return { ...res, result: apps };
    } catch (error) {
      return { ...res, result: [] };
    }
  }
}
