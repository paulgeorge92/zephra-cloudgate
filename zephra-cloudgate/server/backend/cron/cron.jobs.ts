export interface CronJobDefinition {
  name: string;
  envKey: string;
  defaultSchedule: string;
  description: string;
}

export const CLOUDFLARE_24HR_LOGS_CRON = 'CRON_CLOUDFLARE_24HR_LOGS';
export const DEFAULT_CLOUDFLARE_24HR_LOGS_CRON = '0 2 * * *';

export const cronJobDefinitions: Record<string, CronJobDefinition> = {
  cloudflare24HrLogs: {
    name: 'cloudflare24HrLogs',
    envKey: CLOUDFLARE_24HR_LOGS_CRON,
    defaultSchedule: DEFAULT_CLOUDFLARE_24HR_LOGS_CRON,
    description: 'Fetches 24-hour Cloudflare logs and stores them in the SQLite database',
  },
};
