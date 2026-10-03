import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Setting, TranslateFn } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { ResponsiveGrid } from '@/shared/components/ui/responsive-grid';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import type { VoicePreview } from '@/features/settings/hooks/use-voice-preview';
import {
  canChoose,
  canInstallCurrent,
  choiceStatus,
  isNonCommercialChoice,
  megabytes,
  previewClipId,
  type ChoiceStatus,
} from '@/features/settings/model/tts-preview';

type SettingChoiceListProps = {
  setting: Setting;
  siblings: readonly Setting[];
  label: string;
  choiceLabel: (choice: string) => string;
  onChange: (value: string) => void;
  preview: VoicePreview;
};

type ChoiceOptionProps = {
  setting: Setting;
  choice: string;
  name: string;
  clip: string | null;
  selected: boolean;
  preview: VoicePreview;
  onChoose: (choice: string) => void;
};

const OPTION_MIN_WIDTH = 220;
const OPTION_GAP = 8;

function columnsFor(width: number, count: number): number {
  return Math.min(count, Math.max(1, Math.floor((width + OPTION_GAP) / (OPTION_MIN_WIDTH + OPTION_GAP))));
}

function statusText(status: ChoiceStatus, t: TranslateFn): string | null {
  switch (status.kind) {
    case 'ready':
      return null;
    case 'missing': {
      const size = megabytes(status.sizeMb);
      return size ? t('screens.settings.install.missing', { size }) : t('screens.settings.install.missing-unknown');
    }
    case 'installing':
      return t('screens.settings.install.installing');
    case 'failed':
      return t('screens.settings.install.failed');
    case 'host':
      return t('screens.settings.install.host');
  }
}

function ChoiceOption({ setting, choice, name, clip, selected, preview, onChoose }: ChoiceOptionProps) {
  const { t } = useTranslation();
  const status = choiceStatus(setting, choice);
  const enabled = canChoose(setting, choice);
  const playing = clip !== null && preview.playing === clip;

  const detail = statusText(status, t);
  const nonCommercial = isNonCommercialChoice(setting.key, choice);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={detail ? `${name}. ${detail}` : name}
      onPress={() => onChoose(choice)}
      className={cn(
        'min-h-14 flex-row items-center gap-3 rounded-2xl border px-3.5 py-2.5 active:opacity-80',
        selected ? 'border-interactive bg-surface-secondary' : 'border-border-subtle bg-card',
        !enabled && 'opacity-70'
      )}>
      <View
        className={cn(
          'size-4 items-center justify-center rounded-full border-2',
          selected ? 'border-interactive' : 'border-border'
        )}>
        {selected ? <View className="bg-interactive size-2 rounded-full" /> : null}
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label" numberOfLines={1}>
          {name}
        </Text>
        {detail ? (
          <View className="flex-row items-center gap-1.5">
            {status.kind === 'installing' ? <Icon name="download" className="text-muted-foreground size-3" /> : null}
            <Text variant="micro" className="shrink">
              {detail}
            </Text>
          </View>
        ) : null}
        {nonCommercial ? <Text variant="micro">{t('screens.settings.install.non-commercial')}</Text> : null}
      </View>
      {clip ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? t('screens.settings.preview.stop') : t('screens.settings.preview.play', { name })}
          hitSlop={6}
          onPress={() => preview.toggle(clip)}
          className={cn(
            'size-9 items-center justify-center rounded-full active:opacity-70',
            playing && 'bg-interactive',
            !playing && (selected ? 'bg-card' : 'bg-surface-secondary'),
            !playing && 'web:hover:bg-border-subtle'
          )}>
          <Icon
            name={playing ? 'square' : 'play'}
            className={cn('size-4', playing ? 'text-foreground-on-interactive' : 'text-foreground')}
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

export function SettingChoiceList({ setting, siblings, label, choiceLabel, onChange, preview }: SettingChoiceListProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState<string | null>(null);
  const current = choiceStatus(setting, setting.value);
  const hostChoice = revealed ?? (current.kind === 'host' ? setting.value : null);
  const hostStatus = hostChoice === null ? null : choiceStatus(setting, hostChoice);
  const installSize = current.kind === 'missing' || current.kind === 'failed' ? megabytes(current.sizeMb) : '';

  const choose = (choice: string) => {
    if (!canChoose(setting, choice)) {
      setRevealed(choice);
      return;
    }
    setRevealed(null);
    if (choice !== setting.value) onChange(choice);
  };

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="gap-2">
      <ResponsiveGrid
        id={`setting-choices-${setting.key}`}
        items={setting.choices}
        keyOf={(choice) => choice}
        gap={OPTION_GAP}
        columnsFor={columnsFor}
        renderItem={(choice) => (
          <ChoiceOption
            setting={setting}
            choice={choice}
            name={choiceLabel(choice)}
            clip={previewClipId(setting.key, choice, siblings)}
            selected={choice === setting.value}
            preview={preview}
            onChoose={choose}
          />
        )}
      />
      {canInstallCurrent(setting) ? (
        <View className="flex-row flex-wrap items-center gap-3">
          <Button size="sm" onPress={() => onChange(setting.value)}>
            <Icon name="download" className="text-foreground-on-interactive size-4" />
            <Text>
              {installSize
                ? t('screens.settings.install.action-size', { size: installSize })
                : t('screens.settings.install.action')}
            </Text>
          </Button>
          <Text variant="caption" className="min-w-48 flex-1">
            {t('screens.settings.install.action-hint')}
          </Text>
        </View>
      ) : null}
      {hostChoice !== null && hostStatus?.kind === 'host' ? (
        <View className="bg-surface-secondary gap-1.5 rounded-2xl px-4 py-3">
          <Text variant="caption">{t('screens.settings.install.host-hint', { name: choiceLabel(hostChoice) })}</Text>
          <Text variant="caption" selectable className="text-foreground font-mono">
            {hostStatus.command}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
