import { Injectable } from '@nestjs/common';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { Device } from '../shared/types';
import { CloudflareDevice, CloudflareResponse, CloudflareResponseResultInfo } from '../cloudflare/cloudflare.types';

@Injectable()
export class DevicesService {
  constructor(private cloudflare: CloudflareService) {}

  async findAll(): Promise<CloudflareResponse<Device[]>> {
    try {
      const res = await this.cloudflare.getDevices();
      const cfDevices = res.result || [];

      const mapped = cfDevices.map((cf):Device => ({
        id: cf.id,
        active_registrations: cf.active_registrations,
        last_seen_at: cf.last_seen_at || new Date().toISOString(),
        name: cf.name,
        user: cf.user,
        client_version: cf.client_version,
        device_type: cf.device_type,
        model: cf.model || 'Unknown',
        manufacturer: cf.manufacturer,
        mac_address: cf.mac_address,
        os_version: cf.os_version,
        os_version_extra: cf.os_version_extra

      }));

      return {
        result: mapped,
        result_info: res?.result_info as unknown as CloudflareResponseResultInfo,
        success: res?.success || false,
        errors: res?.errors || [],
        messages: res?.messages || [],
      };
    } catch (error) {
      console.error('Error in DevicesService.findAll:', error);
      return { result: [], success: false, errors: [{ code: 500, message: error.message || 'An error occurred while fetching devices' }], messages: [] };
    }
  }

  async getPostureRules() {
    return this.cloudflare.getDevicePostureRules();
  }
}
