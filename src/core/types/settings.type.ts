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
}

export interface SettingsOwner {
  service: SettingsOwnerName;
  reachable: boolean;
  settings: Setting[];
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
