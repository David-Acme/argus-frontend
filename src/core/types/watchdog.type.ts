import type { GuardMaskedCamera } from './guard.type';

export type HeartbeatPresence = 'home' | 'away' | 'unknown';

export type GuardLiveness = 'alive' | 'stale' | 'unknown';

export type DeadmanPlan =
  | { kind: 'arm'; fireAt: number; lastHeardAt: number }
  | { kind: 'disarm' };

export type WatchdogNotice =
  | { kind: 'none' }
  | { kind: 'silent'; since: number };

export type SafetyReach = 'others' | 'contacts' | 'nobody' | 'unknown';

export type SafetyStatus = {
  duressEnabled: boolean;
  hasPin: boolean;
  hasPhrase: boolean;
  alertsReach: SafetyReach | null;
  appSirenEnabled?: boolean;
  maskedCameras: GuardMaskedCamera[];
};

export type PanicResult = {
  alertId: number;
  sent: boolean;
  repeated: boolean;
};

export type SafetyPins = {
  disarmPin: string;
  duressPin: string;
};
