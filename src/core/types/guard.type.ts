export type GuardMode = 'home' | 'away' | 'night' | 'armed';

export type GuardOccupancy = 'manual' | 'armed' | 'open' | 'staffed' | 'closed' | 'asleep';

export type GuardDanger = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type GuardFeedbackLabel = 'useful' | 'false_alarm' | 'not_now';

export interface GuardModeState {
  mode: GuardMode;
  effectiveMode: GuardMode;
  occupancy: GuardOccupancy;
  publicPresent: boolean;
  staffOnly: boolean;
  profile?: GuardSiteProfile;
}

export interface GuardIncident {
  cameraId: number;
  cameraName: string;
  rule: string;
  danger: GuardDanger;
  severity: string;
  personId: number;
  identity: string;
  createdAt: number;
}

export interface GuardExpectedGuest {
  id: number;
  cameraId: number;
  personId: number;
  hostUserId: number;
  description: string;
  oneTime: boolean;
  validFrom: number;
  validUntil: number;
}

export interface GuardExpectedGuestCreate {
  description: string;
  hours: number;
  oneTime: boolean;
}

export type GuardSiteProfile = 'home' | 'office' | 'commercial';

export type GuardClosedMode = 'away' | 'armed';

export interface GuardSite {
  profile: GuardSiteProfile;
  scheduleEnabled: boolean;
  asleep: string;
  open: string;
  staffed: string;
  closedMode: GuardClosedMode;
  digestHour: number;
  updatedAt: number;
}

export type GuardSitePatch = Partial<Omit<GuardSite, 'updatedAt'>>;

export type GuardCameraRole =
  | 'other'
  | 'entrance'
  | 'perimeter'
  | 'garage'
  | 'living'
  | 'kitchen'
  | 'office'
  | 'register'
  | 'storage'
  | 'public_area';

export interface GuardCameraContext {
  cameraId: number;
  role: GuardCameraRole;
  outdoor: boolean;
  publicArea: boolean;
  activeHours: string;
  updatedAt: number;
}

export type GuardCameraContextUpdate = Omit<GuardCameraContext, 'cameraId' | 'updatedAt'>;

export type GuardReason =
  | 'weapon'
  | 'after_hours'
  | 'nobody_home'
  | 'armed'
  | 'night'
  | 'alert_zone'
  | 'several_strangers'
  | 'repeat_visits'
  | 'escalating'
  | 'lingering'
  | 'face_hidden'
  | 'expected_guest'
  | 'with_resident'
  | 'with_guest'
  | 'public_hours'
  | 'staff_hours'
  | 'area_in_use'
  | 'passerby'
  | 'brief';

export type GuardEpisodeKind = 'person' | 'camera';

export type GuardEpisodeSubject = 'stranger' | 'unobserved' | 'several' | 'accompanied' | '';

export type GuardEpisodeResolution = 'left' | 'recognized' | 'recovered' | '';

export interface GuardEpisode {
  id: number;
  kind: GuardEpisodeKind;
  cameraId: number;
  cameraName: string;
  state: 'active' | 'resolved';
  stage: string;
  danger: GuardDanger;
  notified: boolean;
  notifyCount: number;
  highestNotified: GuardDanger;
  subject: GuardEpisodeSubject;
  people: number;
  reasons: string[];
  firstSeen: number;
  lastSeen: number;
  observations: number;
  groupId: number;
  reviewLabel: GuardFeedbackLabel | '';
  reviewedAt: number;
  resolution: GuardEpisodeResolution;
  spoke: boolean;
  sounded: boolean;
  status: string;
}

export interface GuardEpisodePage {
  rows: GuardEpisode[];
  nextBefore: number | null;
}

export type GuardTimelineEntry =
  | { type: 'state'; at: number; state: string; reason: string }
  | {
      type: 'decision';
      at: number;
      until: number;
      danger: GuardDanger;
      suppression: string;
      notified: boolean;
      reasons: string[];
      count: number;
    }
  | { type: 'action'; at: number; action: string; status: string };

export interface GuardEpisodeDetail extends GuardEpisode {
  timeline: GuardTimelineEntry[];
}
