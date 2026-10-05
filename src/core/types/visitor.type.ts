export type VisitorCategory =
  | ''
  | 'neighbor'
  | 'delivery'
  | 'service'
  | 'family'
  | 'acquaintance'
  | 'watchlist';

export interface VisitorSummary {
  id: number;
  name: string;
  category: VisitorCategory;
  note: string;
  visitorNumber: number | null;
  visitCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
  sampleCount: number;
  coverSampleId: number | null;
  cameraIds: number[];
}

export interface VisitorCursor {
  lastSeenAt: number;
  id: number;
}

export interface VisitorList {
  recognitionEnabled: boolean;
  visitors: VisitorSummary[];
  nextCursor?: VisitorCursor | null;
}

export interface VisitorSample {
  id: number;
  quality: number;
  cameraId: number | null;
  hasCrop: boolean;
  createdAt: number;
}

export interface VisitorVisit {
  id: number;
  cameraId: number;
  startedAt: number;
  lastSeenAt: number;
  sightings: number;
}

export interface VisitorPattern {
  weekdays: number[];
  usualHour: number | null;
  visitsConsidered: number;
}

export interface VisitorDetail extends VisitorSummary {
  samples: VisitorSample[];
  visits: VisitorVisit[];
  pattern: VisitorPattern;
}

export interface VisitorSettings {
  recognitionEnabled: boolean;
  unnamedRetentionDays: number;
  minRetentionDays: number;
  maxRetentionDays: number;
  updatedAt: number | null;
}

export interface VisitorCropCapability {
  token: string;
  expiresAt: number;
}

export interface VisitorCropImage {
  mimeType: string;
  base64: string;
}
