import { tk } from '@/core/i18n';

export function profileName(labelKey: string): string {
  const key = `screens.settings.profiles.items.${labelKey}.name`;
  const name = tk(key);
  return name === key ? labelKey : name;
}

export function settingLabel(key: string): string {
  const labelKey = `screens.settings.keys.${key}.label`;
  const label = tk(labelKey);
  return label === labelKey ? key : label;
}
