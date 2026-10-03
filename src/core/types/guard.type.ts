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

export interface GuardDecision {
  eventId: string;
  cameraId: number;
  severity: GuardDanger;
  hardFloor: boolean;
  beliefScore: number;
  beliefThreshold: number;
  didNotify: boolean;
  beliefWouldNotify: boolean;
  legacyWouldNotify: boolean;
  decisionMode: 'shadow' | 'enforce';
  feedbackLabel: GuardFeedbackLabel | '';
  createdAt: number;
}

export interface GuardDecisionPage {
  rows: GuardDecision[];
  hasMore: boolean;
  nextCursor: { createdAt: number; eventId: string } | null;
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
