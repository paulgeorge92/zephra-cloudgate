export * from '@shared/types';

// Frontend-specific interface extensions or UI-only types can go here
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  disabled?: boolean;
}
