export type SettingType = 'toggle' | 'integer' | 'decimal' | 'choice' | 'text';

export type SettingLevel = 'basic' | 'advanced';

export type SettingApply = 'live' | 'nextSession' | 'restart';

export type SettingsOwnerName =
  | 'llm'
  | 'voice'
  | 'tts'
  | 'stt'
  | 'vlm'
  | 'guard'
  | 'camera'
  | 'notification';

export type ChoiceAvailability = 'installed' | 'installable' | 'installing' | 'hostOnly' | 'failed';

export interface ChoiceState {
  choice: string;
  availability: ChoiceAvailability;
  sizeMb: number;
  hostCommand: string;
}

export interface Setting {
  key: string;
  group: string;
  type: SettingType;
  level: SettingLevel;
  apply: SettingApply;
  min: number;
  max: number;
  step: number;
  choices: string[];
  value: string;
  fallback: string;
  choiceStates?: ChoiceState[];
  unit?: string;
  pendingRestart?: boolean;
}

export type ProfileOrigin = 'recommended' | 'owner' | 'reverted';

export interface ProfileMarker {
  id: string;
  origin: ProfileOrigin;
  appliedAt: number;
  keys: string[];
}

export interface SettingsOwner {
  service: SettingsOwnerName;
  reachable: boolean;
  settings: Setting[];
  configured?: boolean;
  configFile?: string;
  capabilities?: string[];
  profile?: ProfileMarker | null;
}

export interface SettingsOverview {
  owners: SettingsOwner[];
}

export interface SettingChange {
  key: string;
  value: string;
}

export interface SettingsUpdateResult {
  applied: string[];
  catalog: SettingsOwner;
}

export type RemoteRowTable = 'setting' | 'session';

export type SettingRejectionReason =
  | 'unknownKey'
  | 'invalid'
  | 'outOfRange'
  | 'notAChoice'
  | 'writeFailed'
  | 'notInstalled';

export type ProfileKeyStatus = 'applied' | 'unchanged' | 'rejected' | 'unreachable';

export type RecommendationReason = 'meets' | 'cores' | 'ram' | 'isa';

export type CpuIsa = 'baseline' | 'avx2' | 'avx512' | 'neon';

export type GpuAccel = 'none' | 'vaapi' | 'qsv' | 'nvdec' | 'videotoolbox';

export interface ProfileInstall {
  availability: ChoiceAvailability;
  sizeMb: number;
  hostCommand: string;
}

export interface ProfileChange {
  key: string;
  from: string | null;
  to: string;
  changed: boolean;
  apply?: SettingApply;
  install?: ProfileInstall;
}

export interface ProfileOwnerPreview {
  service: SettingsOwnerName;
  reachable: boolean;
  changes: ProfileChange[];
}

export interface SettingsProfile {
  id: string;
  labelKey: string;
  current: boolean;
  owners: ProfileOwnerPreview[];
}

export interface RecommendationRule {
  profile: string;
  minCores: number;
  minRamGb: number;
  vectorIsa: boolean;
}

export interface HardwareFacts {
  cores: number;
  threads: number;
  ramGb: number;
  isa: CpuIsa;
  gpu: GpuAccel;
}

export interface ProfileRecommendation {
  profile: string;
  reason: RecommendationReason;
  hardware: HardwareFacts;
  rule: RecommendationRule | null;
  missed: RecommendationRule | null;
  rules: RecommendationRule[];
  fallback: string;
}

export type FirstRunStateName = 'applied' | 'reverted';

export interface FirstRunOwner {
  service: SettingsOwnerName;
  keys: string[];
}

export interface FirstRunState {
  profile: string;
  state: FirstRunStateName;
  appliedAt: number;
  owners: FirstRunOwner[];
}

export interface SettingsProfiles {
  profiles: SettingsProfile[];
  recommendation: ProfileRecommendation;
  firstRun?: FirstRunState | null;
}

export interface ProfileKeyResult {
  key: string;
  from: string | null;
  to: string;
  status: ProfileKeyStatus;
  reason?: SettingRejectionReason;
}

export interface ProfileOwnerResult {
  service: SettingsOwnerName;
  reachable: boolean;
  results: ProfileKeyResult[];
  catalog?: SettingsOwner;
}

export interface ProfileApplyResult {
  profile: string;
  summary: Record<ProfileKeyStatus, number>;
  owners: ProfileOwnerResult[];
}
