import { Injectable } from '@nestjs/common';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { CloudflareResponse } from '../cloudflare/cloudflare.types';
import { ReusableList } from '../shared/types';

@Injectable()
export class ListsService {
  constructor(private readonly cloudflare: CloudflareService) {}

  async findAll(): Promise<CloudflareResponse<ReusableList[]>> {
    return this.cloudflare.getGatewayLists();
  }

  async findOne(id: string): Promise<CloudflareResponse<ReusableList>> {
    return this.cloudflare.getGatewayList(id);
  }

  async create(data: any): Promise<CloudflareResponse<ReusableList>> {
    return this.cloudflare.createGatewayList(data);
  }

  async update(id: string, data: any): Promise<CloudflareResponse<ReusableList>> {
    return this.cloudflare.updateGatewayList(id, data);
  }

  async updateDetails(id: string, data: any) {
    return this.cloudflare.updateGatewayListDetails(id, data);
  }

  async delete(id: string) {
    return this.cloudflare.deleteGatewayList(id);
  }
}
