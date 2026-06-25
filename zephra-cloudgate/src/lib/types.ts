import type * as Shared from '@shared/types';

export type UserRole = Shared.UserRole;
export type Application = Shared.Application;
export type ApplicationExposureTypeEnum = Shared.ApplicationExposureTypeEnum;
export type Tunnel = Shared.Tunnel;
export type HealthStatus = Shared.HealthStatus;

// Frontend-specific interface extensions or UI-only types can go here
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  disabled?: boolean;
}
