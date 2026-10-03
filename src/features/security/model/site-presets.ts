import type { GuardSitePatch, GuardSiteProfile } from '@/core/types';

export type SiteHoursKind = 'asleep' | 'staffed' | 'open';

export const SITE_HOURS_BY_PROFILE: Readonly<Record<GuardSiteProfile, readonly SiteHoursKind[]>> = {
  home: ['asleep'],
  office: ['staffed'],
  commercial: ['open', 'staffed'],
};

export const SITE_PRESETS: Readonly<Record<GuardSiteProfile, GuardSitePatch>> = {
  home: { asleep: '23:00-07:00' },
  office: { staffed: 'mon-fri 08:00-19:00' },
  commercial: {
    open: 'tue-sun 13:00-16:00, tue-sun 20:00-24:00',
    staffed: 'tue-sun 10:00-13:00, tue-sun 16:00-20:00',
  },
};
