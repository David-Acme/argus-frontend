export const MAINTENANCE_END_REASONS = ['done', 'expired', 'unknown_person', 'replaced'] as const;

export type MaintenanceEndReason = (typeof MAINTENANCE_END_REASONS)[number];

export const MAINTENANCE_SOURCES = ['app', 'assistant', 'reply', 'alert'] as const;

export type MaintenanceSource = (typeof MAINTENANCE_SOURCES)[number];

export const MAINTENANCE_VIEW_STATES = ['pending', 'accepted', 'refused'] as const;

export type MaintenanceViewState = (typeof MAINTENANCE_VIEW_STATES)[number];

export type MaintenanceViewCheck = {
  cameraId: number;
  cameraName: string;
  state: MaintenanceViewState;
};

export type MaintenanceWindow = {
  id: number;
  environmentId: number;
  cameraIds: number[];
  declaredBy: number;
  declaredByName: string;
  startedAt: number;
  endsAt: number;
  endedAt: number | null;
  endReason: MaintenanceEndReason | null;
  active: boolean;
  duress: boolean;
  source: MaintenanceSource;
  viewChecks: MaintenanceViewCheck[];
};

export type MaintenanceList = {
  windows: MaintenanceWindow[];
};

export type MaintenanceDeclare = {
  cameraIds?: number[];
  environmentId?: number;
  minutes?: number;
};

export type MaintenanceViewAnswer = {
  cameraId: number;
  accept: boolean;
};

export type TamperAskAnswer = 'me' | 'no';

export const TAMPER_STATUSES = [
  'covered',
  'whiteout',
  'blinded',
  'partial_cover',
  'blurred',
  'moved',
  'dark_sudden',
  'unreachable',
] as const;

export type TamperStatus = (typeof TAMPER_STATUSES)[number];
