import { t, tk } from '@/core/i18n';
import type { Setting, SettingsOwner } from '@/core/types';
import type { SettingText, TechnicalRow } from '@/features/settings/model/settings-catalog';

function humanize(key: string): string {
  const leaf = key.split('.').pop() ?? key;
  const words = leaf.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function translated(key: string): string | null {
  const text = tk(key);
  return text === key ? null : text;
}

export function settingText(key: string): SettingText {
  return {
    label: translated(`screens.settings.keys.${key}.label`) ?? humanize(key),
    hint: translated(`screens.settings.keys.${key}.hint`) ?? '',
  };
}

export function rowText(row: TechnicalRow): SettingText {
  return settingText(row.setting.key);
}

export function choiceLabel(choice: string): string {
  return translated(`screens.settings.choices.${choice}`) ?? choice;
}

export function groupLabel(group: string): string {
  return translated(`screens.settings.groups.${group}`) ?? group;
}

export function unitLabel(unit: string | undefined): string {
  if (!unit) return '';
  return translated(`screens.settings.units.${unit}`) ?? unit;
}

export function ownerName(owner: Pick<SettingsOwner, 'service'>): string {
  return t(`screens.settings.owners.${owner.service}.name`);
}

function decimalsOf(step: number): number {
  if (step <= 0 || Number.isInteger(step)) return 0;
  return Math.min(3, String(step).split('.')[1]?.length ?? 0);
}

export function numberText(setting: Setting, value: number): string {
  return setting.type === 'integer' ? String(Math.round(value)) : String(Number(value.toFixed(decimalsOf(setting.step))));
}

export function valueText(setting: Setting, value: string): string {
  if (setting.type === 'toggle')
    return value === 'true' ? t('screens.settings.technical.on') : t('screens.settings.technical.off');
  if (setting.type === 'choice') return choiceLabel(value);
  if (setting.type === 'text') return value === '' ? t('screens.settings.technical.empty') : value;
  const unit = unitLabel(setting.unit);
  return unit ? `${value} ${unit}` : value;
}

export function rangeText(setting: Setting): string {
  const unit = unitLabel(setting.unit);
  const range = `${numberText(setting, setting.min)} – ${numberText(setting, setting.max)}${unit ? ` ${unit}` : ''}`;
  return setting.step > 0
    ? t('screens.settings.technical.range-step', { range, step: numberText(setting, setting.step) })
    : range;
}

export function spokenList(items: readonly string[], conjunction: string): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}
