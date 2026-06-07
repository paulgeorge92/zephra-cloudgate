import { Injectable } from '@nestjs/common';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { 
  FirewallPolicy, 
  RequestResponse, 
  FirewallContentCategory, 
  FirewallAppType
} from '../shared/types';
import { CloudflareGatewayRule } from '../cloudflare/cloudflare.types';

@Injectable()
export class FirewallService {
  constructor(private readonly cloudflareService: CloudflareService) {}

  async getFirewallPolicies(): Promise<RequestResponse<FirewallPolicy[]>> {
    try {
      const response = await this.cloudflareService.getGatewayRules();
      const rules = response.result || [];

      const policies: FirewallPolicy[] = rules.map(rule => this.mapToFirewallPolicy(rule));

      return {
        success: response.success,
        result: policies,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  async getFirewallPolicy(id: string): Promise<RequestResponse<FirewallPolicy>> {
    try {
      const response = await this.cloudflareService.getGatewayRule(id);
      if (!response.result) {
        return { success: false, message: 'Policy not found' };
      }

      return {
        success: response.success,
        result: this.mapToFirewallPolicy(response.result),
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  async createFirewallPolicy(data: Partial<FirewallPolicy>): Promise<RequestResponse<FirewallPolicy>> {
    try {
      const payload: Partial<CloudflareGatewayRule> = {
        name: data.name,
        description: data.description,
        action: data.action?.toLowerCase(),
        enabled: data.enabled ?? true,
        precedence: data.precedence,
        traffic: data.traffic,
        filters: this.mapTypeToFilters(data.type),
        rule_settings: data.rule_settings,
      };

      const response = await this.cloudflareService.createGatewayRule(payload);
      return {
        success: response.success,
        result: this.mapToFirewallPolicy(response.result),
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  async deleteFirewallPolicy(id: string): Promise<RequestResponse<null>> {
    try {
      await this.cloudflareService.deleteGatewayRule(id);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  async getAppTypes(): Promise<RequestResponse<FirewallAppType[]>> {
    try {
      const response = await this.cloudflareService.getGatewayAppTypes();
      return {
        success: response.success,
        result: response.result,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  async getCategories(): Promise<RequestResponse<FirewallContentCategory[]>> {
    try {
      const response = await this.cloudflareService.getContentCategories();
      return {
        success: response.success,
        result: response.result,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  async getUiOptions(): Promise<RequestResponse<any>> {
    try {
      const response = await this.cloudflareService.getGatewayUiOptions();
      return {
        success: response.success,
        result: response.result,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  async getFileTypes(): Promise<RequestResponse<any>> {
    try {
      const response = await this.cloudflareService.getDlpFileTypes();
      return {
        success: response.success,
        result: response.result,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      };
    }
  }

  private mapToFirewallPolicy(rule: CloudflareGatewayRule): FirewallPolicy {
    return {
      id: rule.id || '',
      name: rule.name,
      description: rule.description,
      action: rule.action.toUpperCase(),
      enabled: rule.enabled,
      traffic: rule.traffic,
      type: this.mapFiltersToType(rule.filters),
      identity: rule.identity,
      rule_settings: rule.rule_settings,
      filters: rule.filters,
      created_at: rule.created_at,
      updated_at: rule.updated_at,
      precedence: rule.precedence || 0,
    };
  }

  private mapFiltersToType(filters?: string[]): 'NETWORK' | 'DNS' | 'HTTP' {
    if (!filters || filters.length === 0) return 'NETWORK';
    if (filters.includes('dns')) return 'DNS';
    if (filters.includes('http')) return 'HTTP';
    return 'NETWORK';
  }

  private mapTypeToFilters(type?: string): string[] {
    switch (type?.toUpperCase()) {
      case 'DNS': return ['dns'];
      case 'HTTP': return ['http'];
      case 'NETWORK': return ['l4'];
      default: return ['l4'];
    }
  }
}
