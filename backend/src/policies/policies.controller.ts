import { Controller, Get, Delete, Param, UseGuards, Query } from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccessApp, AccessCondition, AccessPolicy, RequestResponse } from '../shared/types';
import { CloudflareAccessApplication } from 'src/cloudflare/cloudflare.types';

@UseGuards(JwtAuthGuard)
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  async findAll(@Query('page') page?: number, @Query('per_page') per_page?: number) {
    const result = await this.policiesService.findAll(page, per_page);
    return { ...result, success: true };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<RequestResponse<any>> {
    const result = await this.policiesService.findOne(id);
    return { ...result };
  }

  @Get(':id/apps')
  async getApps(@Param('id') id:string):Promise<RequestResponse<AccessApp[]>>{
    const res = await this.policiesService.getAppsUsingPolicy(id);
    const result: AccessApp[] = res.result.map((app): AccessApp=>({
      id: app.id || '',
      created_at: app.created_at || new Date().toISOString(),
      custom_deny_url: app.custom_deny_url,
      custom_non_identity_deny_url: app.custom_non_identity_deny_url,
      domain: app.domain || '',
      logo_url: app.logo_url || '',
      name: app.name,
      policies: app.policies?.map((policy) : AccessPolicy =>({
        id: policy.id,
        name: policy.name,
        account_id: policy.account_id,
        decision: policy.decision,
        app_count: policy.app_count,
        approval_groups: policy.approval_groups,
        approval_required: policy.approval_required,
        include: policy.include,
        exclude: policy.exclude,
        require: policy.require,
        created_at: policy.created_at || new Date().toISOString(),
        updated_at: policy.updated_at || new Date().toISOString(),
        connection_rules: policy.connection_rules

      })) || [],
      session_duration: app.session_duration || '',
      type: app.type || '',
      updated_at: app.updated_at || new Date().toISOString()
    }));
    return {...res, result}
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<RequestResponse<any>> {
    const result = await this.policiesService.delete(id);
    return { ...result };
  }
}
