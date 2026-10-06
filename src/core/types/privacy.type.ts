export type PrivacySignal = 'presence' | 'faceCameras' | 'voiceLearning' | 'cameraAudio';

export type PrivacyChoices = Record<PrivacySignal, boolean>;

export interface PrivacyState {
  decided: boolean;
  noticeVersion: number;
  current: boolean;
  decidedAt: number | null;
  updatedAt: number | null;
  choices: PrivacyChoices;
  effective: PrivacyChoices;
}

export interface PrivacyMe extends PrivacyState {
  currentNoticeVersion: number;
  household: PrivacyChoices;
  applicable?: PrivacyChoices;
}

export interface HouseholdPrivacy extends PrivacyChoices {
  visitorRecognition: boolean;
}

export interface UserPrivacy extends PrivacyState {
  userId: number;
}

export interface PrivacyDirectory {
  currentNoticeVersion: number;
  applicable?: PrivacyChoices;
  household: HouseholdPrivacy;
  householdUpdatedAt: number | null;
  visitorAcknowledgedAt: number | null;
  users: UserPrivacy[];
}

export type HouseholdPrivacyPatch = Partial<HouseholdPrivacy> & { acknowledge?: boolean };
