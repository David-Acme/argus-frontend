import type { GuardEnvironmentKind, GuardEnvironmentPatch, GuardHoursKind } from '@/core/types';

export const HOURS_BY_KIND: Readonly<Record<GuardEnvironmentKind, readonly GuardHoursKind[]>> = {
  home: ['asleep'],
  office: ['staffed'],
  commercial: ['open', 'staffed'],
  restaurant: ['open', 'staffed'],
  warehouse: ['staffed'],
  outdoor: ['open', 'staffed'],
};

export const ENVIRONMENT_PRESETS: Readonly<Record<GuardEnvironmentKind, GuardEnvironmentPatch>> = {
  home: { asleep: '23:00-07:00' },
  office: { staffed: 'mon-fri 08:00-19:00' },
  commercial: { open: 'mon-sat 10:00-20:00', staffed: 'mon-sat 09:00-10:00, mon-sat 20:00-21:00' },
  restaurant: {
    open: 'tue-sun 13:00-16:00, tue-sun 20:00-24:00',
    staffed: 'tue-sun 10:00-13:00, tue-sun 16:00-20:00',
  },
  warehouse: { staffed: 'mon-fri 07:00-17:00' },
  outdoor: { open: '07:00-22:00' },
};
