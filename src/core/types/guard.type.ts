export type GuardMode = 'home' | 'away' | 'night' | 'armed';

export type GuardOccupancy = 'manual' | 'armed' | 'open' | 'staffed' | 'closed' | 'asleep';

export type GuardDanger = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type GuardFeedbackLabel = 'useful' | 'false_alarm' | 'not_now';

export type GuardEnvironmentKind = 'home' | 'office' | 'commercial' | 'restaurant' | 'warehouse' | 'outdoor';

export type GuardQuietPolicy = 'inherit' | 'custom' | 'off';

export type GuardClosedMode = 'away' | 'armed';

export interface GuardEnvironment {
  id: number;
  name: string;
  kind: GuardEnvironmentKind;
  isDefault: boolean;
  mode: GuardMode;
  effectiveMode: GuardMode;
  occupancy: GuardOccupancy;
  publicPresent: boolean;
  staffOnly: boolean;
  scheduleEnabled: boolean;
  asleep: string;
  open: string;
  staffed: string;
  closedMode: GuardClosedMode;
  digestHour: number;
  quietPolicy: GuardQuietPolicy;
  quietStartHour: number;
  quietEndHour: number;
  cameraIds: number[];
  modeUpdatedAt: number;
  updatedAt: number;
}

export type GuardEnvironmentPatch = Partial<
  Pick<
    GuardEnvironment,
    | 'name'
    | 'kind'
    | 'scheduleEnabled'
    | 'asleep'
    | 'open'
    | 'staffed'
    | 'closedMode'
    | 'digestHour'
    | 'quietPolicy'
    | 'quietStartHour'
    | 'quietEndHour'
  >
>;

export type GuardEnvironmentCreate = GuardEnvironmentPatch & {
  name: string;
  kind: GuardEnvironmentKind;
};

export type GuardHoursKind = 'asleep' | 'staffed' | 'open';

export interface GuardExpectedGuest {
  id: number;
  cameraId: number;
  environmentId: number;
  personId: number;
  hostUserId: number;
  description: string;
  oneTime: boolean;
  validFrom: number;
  validUntil: number;
}

export interface GuardExpectedGuestCreate {
  description: string;
  cameraId?: number;
  environmentId?: number;
  hours: number;
  oneTime: boolean;
}

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
  environmentId: number;
  updatedAt: number;
}

export type GuardCameraContextUpdate = Omit<GuardCameraContext, 'cameraId' | 'updatedAt' | 'environmentId'> & {
  environmentId?: number;
};

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
  | 'brief'
  | 'watchlist';

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
  retainUntil?: number;
  resolution: GuardEpisodeResolution;
  spoke: boolean;
  sounded: boolean;
  status: string;
  environmentId: number;
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

export interface CameraEnvironmentBadge {
  environmentId: number;
  name: string;
  kind: GuardEnvironmentKind;
  mode: GuardMode;
  effectiveMode: GuardMode;
  armed: boolean;
  several: boolean;
}

export type EnvironmentMatch =
  | { kind: 'all' }
  | { kind: 'one'; environment: GuardEnvironment }
  | { kind: 'unknown' };
