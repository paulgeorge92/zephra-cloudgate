import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { PrismaService } from '../prisma.service';
import { cronJobDefinitions } from './cron.jobs';
import { CloudflareDNSLog, CloudflareHTTPLog, CloudflareNetworkLog } from '../cloudflare/cloudflare.types';

@Injectable()
export class CronService implements OnModuleInit {
  private readonly logger = new Logger(CronService.name);
  private cronJobs: { [name: string]: NodeJS.Timeout } = {};

  constructor(
    private readonly configService: ConfigService,
    private readonly cloudflareService: CloudflareService,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    this.scheduleCronJob(cronJobDefinitions.cloudflare24HrLogs.name, this.configService.get<string>(cronJobDefinitions.cloudflare24HrLogs.envKey) || cronJobDefinitions.cloudflare24HrLogs.defaultSchedule, async () => {
      await this.runCloudflare24HrLogs();
    });
  }

  private scheduleCronJob(name: string, cronExpression: string, callback: () => Promise<void>) {
    const intervalMs = this.getNextCronDelayMs(cronExpression);

    if (intervalMs === null) {
      this.logger.error(`Invalid cron expression for job ${name}: ${cronExpression}`);
      return;
    }

    this.logger.log(`Scheduling cron job ${name} to run at: ${cronExpression}`);
    this.cronJobs[name] = setTimeout(async () => {
      try {
        await callback();
      } catch (error) {
        this.logger.error(`Cron job ${name} failed`, error as Error);
      } finally {
        this.scheduleCronJob(name, cronExpression, callback);
      }
    }, intervalMs);
  }

  private getNextCronDelayMs(cronExpression: string): number | null {
    const parts = cronExpression.trim().split(' ');
    if (parts.length !== 5) {
      return null;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    const now = new Date();
    const next = new Date(now.getTime() + 60 * 1000);

    while (true) {
      if (this.matchCronField(next.getMinutes(), minute) && this.matchCronField(next.getHours(), hour) && this.matchCronField(next.getDate(), dayOfMonth) && this.matchCronField(next.getMonth() + 1, month) && this.matchCronField(next.getDay(), dayOfWeek)) {
        return next.getTime() - now.getTime();
      }
      next.setTime(next.getTime() + 60 * 1000);
    }
  }

  private matchCronField(value: number, field: string): boolean {
    if (field === '*') {
      return true;
    }
    if (field.includes(',')) {
      return field.split(',').some((part) => this.matchCronField(value, part));
    }
    if (field.includes('/')) {
      const [range, step] = field.split('/');
      const stepValue = Number(step);
      if (Number.isNaN(stepValue) || stepValue <= 0) {
        return false;
      }
      if (range === '*') {
        return value % stepValue === 0;
      }
      const [start, end] = range.split('-').map(Number);
      return value >= start && value <= end && (value - start) % stepValue === 0;
    }
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      return value >= start && value <= end;
    }
    return Number(field) === value;
  }

  private async runCloudflare24HrLogs() {
    this.logger.log('Starting Cloudflare 24-hour logs import');

    const history = await this.prisma.logImportHistory.create({
      data: {
        job_name: cronJobDefinitions.cloudflare24HrLogs.name,
        started_at: new Date(),
        status: 'STARTED',
        message: 'Cron job started',
      },
    });

    try {
      const result = await this.cloudflareService.get24HrLogs();
      if (!result.success) {
        const errorMessage = 'Cloudflare 24Hr logs import failed: ' + result.messages.join(', ');
        await this.prisma.logImportHistory.update({
          where: { id: history.id },
          data: {
            completed_at: new Date(),
            status: 'FAILED',
            message: errorMessage,
          },
        });
        this.logger.error(errorMessage);
        return;
      }

      await this.storeDNSLogs(result.result.dns);
      await this.storeNetworkLogs(result.result.l4);
      await this.storeHTTPLogs(result.result.http);

      await this.prisma.logImportHistory.update({
        where: { id: history.id },
        data: {
          completed_at: new Date(),
          status: 'SUCCESS',
          message: 'Import successful',
        },
      });

      this.logger.log('Cloudflare 24-hour logs import completed');
    } catch (error) {
      const errorMessage = `Cloudflare 24Hr logs import failed: ${(error as Error).message || error}`;
      await this.prisma.logImportHistory.update({
        where: { id: history.id },
        data: {
          completed_at: new Date(),
          status: 'FAILED',
          message: errorMessage,
        },
      });
      this.logger.error(errorMessage);
    }
  }

  private async storeDNSLogs(logs: CloudflareDNSLog[]) {
    if (!logs.length) {
      return;
    }

    const data = logs.map((log) => ({
      query: log.query,
      query_type: log.query_type,
      policy_uuid: log.policy_uuid,
      location_uuid: log.location_uuid,
      source_ip: log.source_ip,
      destination_ip: log.destination_ip,
      destination_port: log.destination_port,
      protocol: log.protocol,
      datetime: new Date(log.datetime * 1000),
      decision: log.decision,
      blocked: log.blocked,
      overridden: log.overridden,
      query_category_ids: JSON.stringify(log.query_category_ids || []),
      initial_category_ids: JSON.stringify(log.initial_category_ids || []),
      cname_category_ids: JSON.stringify(log.cname_category_ids || []),
      rdata: JSON.stringify(log.rdata || []),
      email: log.email,
      user_id: log.user_id,
      device_id: log.device_id,
      dnssec_validation_disabled: log.dnssec_validation_disabled,
      ede_errors: JSON.stringify(log.ede_errors || []),
      src_country: log.src_country,
      tenant_configuration_account_id: log.tenant_configuration_account_id,
      host_application_id: log.host_application_id,
      rcode: log.rcode,
      time_zone_inferred_method: log.time_zone_inferred_method,
      custom_resolver_address: log.custom_resolver_address,
      custom_resolver_response: log.custom_resolver_response,
      custom_resolver_time_in_ms: log.custom_resolver_time_in_ms,
      custom_resolver_rule_uuid: log.custom_resolver_rule_uuid,
      is_response_cached: log.is_response_cached,
      colo_id: log.colo_id,
      metal_id: log.metal_id,
      resolved_ips: JSON.stringify(log.resolved_ips || []),
      authoritative_nameserver_ips: JSON.stringify(log.authoritative_nameserver_ips || []),
      doh_subdomain: log.doh_subdomain,
      dot_subdomain: log.dot_subdomain,
      resolved_country_codes: JSON.stringify(log.resolved_country_codes || []),
      resolved_continent_codes: JSON.stringify(log.resolved_continent_codes || []),
      src_country_code: log.src_country_code,
      src_continent_code: log.src_continent_code,
      cnames: JSON.stringify(log.cnames || []),
      query_id: log.query_id,
      resolver_rule_id: log.resolver_rule_id,
      internal_dns_rcode: log.internal_dns_rcode,
      internal_dns_time_in_ms: log.internal_dns_time_in_ms,
      redirect_target_uri: log.redirect_target_uri,
      registration_id: log.registration_id,
      query_application_ids: JSON.stringify(log.query_application_ids || []),
      matched_tunnel_type: log.matched_tunnel_type,
      response_time_ms: log.response_time_ms
    }));

    await this.prisma.cloudflareDNSLog.createMany({ data });
  }

  private async storeNetworkLogs(logs: CloudflareNetworkLog[]) {
    if (!logs.length) {
      return;
    }

    const data = logs.map((log) => ({
      session_id: log.session_id,
      datetime: new Date(log.datetime * 1000),
      account_id: log.account_id,
      user_id: log.user_id,
      device_id: log.device_id,
      virtual_network_id: log.virtual_network_id,
      rule_id: log.rule_id,
      action: log.action,
      action_name: log.action_name,
      source_ip: log.source_ip,
      source_internal_ip: log.source_internal_ip,
      source_port: log.source_port,
      destination_ip: log.destination_ip,
      destination_port: log.destination_port,
      override_ip: log.override_ip,
      override_port: log.override_port,
      transport: log.transport,
      email: log.email,
      sni: log.sni,
      last_authenticated_at: new Date(log.last_authenticated_at * 1000),
      src_country: log.src_country,
      dst_country: log.dst_country,
      src_continent: log.src_continent,
      dst_continent: log.dst_continent,
      proxy_endpoint: log.proxy_endpoint,
      detected_protocol: log.detected_protocol,
      access_app_auds: JSON.stringify(log.access_app_auds || []),
      colo_id: log.colo_id,
      metal_id: log.metal_id,
      application_ids: JSON.stringify(log.application_ids || []),
      category_ids: JSON.stringify(log.category_ids || []),
      redirect_target_uri: log.redirect_target_uri,
      registration_id: log.registration_id
    }));

    await this.prisma.cloudflareNetworkLog.createMany({ data });
  }

  private async storeHTTPLogs(logs: CloudflareHTTPLog[]) {
    if (!logs.length) {
      return;
    }

    const data = logs.map((log) => ({
      session_id: log.session_id,
      datetime: new Date(log.datetime * 1000),
      request_id: log.request_id,
      account_id: log.account_id,
      user_id: log.user_id,
      email: log.email,
      device_id: log.device_id,
      rule_id: log.rule_id,
      action: log.action,
      action_name: log.action_name,
      is_isolated: log.is_isolated,
      http_host: log.http_host,
      http_method: log.http_method,
      http_method_name: log.http_method_name,
      http_version: log.http_version,
      http_version_name: log.http_version_name,
      http_status_code: log.http_status_code,
      url: log.url,
      referer: log.referer,
      user_agent: log.user_agent,
      source_ip: log.source_ip,
      source_internal_ip: log.source_internal_ip,
      source_port: log.source_port,
      destination_ip: log.destination_ip,
      destination_port: log.destination_port,
      uploaded_file_names: JSON.stringify(log.uploaded_file_names || []),
      downloaded_file_names: JSON.stringify(log.downloaded_file_names || []),
      upload_matched_dlp_profiles: JSON.stringify(log.upload_matched_dlp_profiles || []),
      download_matched_dlp_profiles: JSON.stringify(log.download_matched_dlp_profiles || []),
      upload_matched_dlp_profileEntries: JSON.stringify(log.upload_matched_dlp_profileEntries || []),
      download_matched_dlp_profileEntries: JSON.stringify(log.download_matched_dlp_profileEntries || []),
      dlp_match_context: log.dlp_match_context,
      dlp_match_context_parsed: log.dlp_match_context_parsed,
      file_info: JSON.stringify(log.file_info || { f: [] }),
      blocked_file_name: log.blocked_file_name,
      blocked_file_type: log.blocked_file_type,
      blocked_file_hash: log.blocked_file_hash,
      blocked_file_size: log.blocked_file_size,
      blocked_file_reason: log.blocked_file_reason,
      added_headers: JSON.stringify(log.added_headers || []),
      last_authenticated_at: new Date(log.last_authenticated_at * 1000),
      request_antivirus_scanned: log.request_antivirus_scanned,
      response_antivirus_scanned: log.response_antivirus_scanned,
      quarantined: log.quarantined,
      src_country: log.src_country,
      dst_country: log.dst_country,
      src_continent: log.src_continent,
      dst_continent: log.dst_continent,
      proxy_endpoint: log.proxy_endpoint,
      untrusted_cert_action: log.untrusted_cert_action,
      access_app_aud: log.access_app_aud,
      colo_id: log.colo_id,
      metal_id: log.metal_id,
      application_ids: JSON.stringify(log.application_ids || []),
      application_type_ids: JSON.stringify(log.application_type_ids || []),
      category_ids: JSON.stringify(log.category_ids || []),
      virtual_network_id: log.virtual_network_id,
      forensic_copy_status: log.forensic_copy_status,
      redirect_target_uri: log.redirect_target_uri,
      registration_id: log.registration_id,
      gen_ai_prompt_request: log.gen_ai_prompt_request,
      gen_ai_prompt_response: log.gen_ai_prompt_response,
      gen_ai_conversation: log.gen_ai_conversation,
      application_statuses: JSON.stringify(log.application_statuses || []),
      app_control_info: JSON.stringify(log.app_control_info || null),
      upload_matched_dlp_data_classes: JSON.stringify(log.upload_matched_dlp_data_classes || []),
      download_matched_dlp_data_classes: JSON.stringify(log.download_matched_dlp_data_classes || []),
      upload_matched_dlp_data_tags: JSON.stringify(log.upload_matched_dlp_data_tags || []),
      download_matched_dlp_data_tags: JSON.stringify(log.download_matched_dlp_data_tags || []),
      upload_matched_dlp_sensitivity_levels: JSON.stringify(log.upload_matched_dlp_sensitivity_levels || []),
      download_matched_dlp_sensitivity_levels: JSON.stringify(log.download_matched_dlp_sensitivity_levels || [])
    }));

    await this.prisma.cloudflareHTTPLog.createMany({ data });
  }
}
