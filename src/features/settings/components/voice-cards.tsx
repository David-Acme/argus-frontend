import { clsx } from 'clsx';
import { useState } from 'react';
import { View } from 'react-native';
import type { Setting, TranslateFn } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { useThemeTokens, useWindowLayout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';
import type { ChipTone } from '@/shared/ui/chip';
import { Notice } from '@/shared/ui/notice';
import { PressableSurface } from '@/shared/ui/pressable';
import { Section } from '@/shared/ui/section';
import { Text } from '@/shared/ui/text';
import type { VoicePreview } from '@/features/settings/hooks/use-voice-preview';
import { choiceLabel, settingText } from '@/features/settings/model/setting-text';
import {
  canChoose,
  canInstallCurrent,
  choiceStatus,
  isNonCommercialChoice,
  megabytes,
  previewClipId,
} from '@/features/settings/model/tts-preview';
import type { ChoiceStatus } from '@/features/settings/model/tts-preview';

type VoiceCardsProps = {
  setting: Setting;
  siblings: readonly Setting[];
  preview: VoicePreview;
  onChange: (value: string) => void;
};

type CardProps = {
  setting: Setting;
  choice: string;
  clip: string | null;
  preview: VoicePreview;
  onChoose: (choice: string) => void;
};

type Badge = { label: string; tone: ChipTone } | null;

const COLUMNS = 2;
const WIDE_COLUMNS = 4;

function rowsOf(choices: readonly string[], columns: number): (string | null)[][] {
  const rows: (string | null)[][] = [];
  for (let start = 0; start < choices.length; start += columns) {
    const row: (string | null)[] = choices.slice(start, start + columns);
    while (row.length < columns) row.push(null);
    rows.push(row);
  }
  return rows;
}

function badgeOf(status: ChoiceStatus, t: TranslateFn): Badge {
  switch (status.kind) {
    case 'ready':
      return null;
    case 'missing': {
      const size = megabytes(status.sizeMb);
      return {
        label: size
          ? t('screens.settings.install.action-size', { size })
          : t('screens.settings.install.action'),
        tone: 'default',
      };
    }
    case 'installing':
      return { label: t('screens.settings.install.installing'), tone: 'default' };
    case 'failed':
      return { label: t('screens.settings.install.failed'), tone: 'attn' };
    case 'host':
      return { label: t('screens.settings.install.host'), tone: 'default' };
  }
}

function VoiceCard({ setting, choice, clip, preview, onChoose }: CardProps) {
  const { t } = useTranslation();
  const { elevation } = useThemeTokens();
  const name = choiceLabel(choice);
  const selected = choice === setting.value;
  const playing = clip !== null && preview.playing === clip;
  const badge = badgeOf(choiceStatus(setting, choice), t);
  const card = { boxShadow: elevation.card };
  return (
    <PressableSurface
      a11y={{ label: badge ? `${name}, ${badge.label}` : name, role: 'radio', checked: selected }}
      onPress={() => onChoose(choice)}
      haptic="selection"
      pressed={{ scale: 'surface' }}
      style={card}
      className={clsx(
        'bg-surface rounded-card min-h-target flex-1 gap-2 border-2 p-4',
        selected ? 'border-ink' : 'border-transparent'
      )}>
      {clip ? (
        <Button
          iconOnly
          compact
          filled
          icon={playing ? 'stop' : 'play'}
          label={
            playing
              ? t('screens.settings.preview.stop')
              : t('screens.settings.preview.play', { name })
          }
          onPress={() => preview.toggle(clip)}
        />
      ) : null}
      <Text variant="headline">{name}</Text>
      {badge ? <Chip label={badge.label} tone={badge.tone} /> : null}
      {isNonCommercialChoice(setting.key, choice) ? (
        <Text variant="caption" tone="3">
          {t('screens.settings.install.non-commercial')}
        </Text>
      ) : null}
    </PressableSurface>
  );
}

export function VoiceCards({ setting, siblings, preview, onChange }: VoiceCardsProps) {
  const { t } = useTranslation();
  const { windowClass } = useWindowLayout();
  const [revealed, setRevealed] = useState<string | null>(null);
  const host = revealed === null ? null : choiceStatus(setting, revealed);
  const wide = windowClass === 'expanded' || windowClass === 'wide';

  const choose = (choice: string) => {
    if (!canChoose(setting, choice)) {
      setRevealed(choice);
      return;
    }
    setRevealed(null);
    if (choice === setting.value) {
      if (canInstallCurrent(setting)) onChange(choice);
      return;
    }
    const previous = setting.value;
    onChange(choice);
    toast.success(t('screens.settings.voices.chosen', { name: choiceLabel(choice) }), undefined, {
      label: t('common.undo'),
      onPress: () => onChange(previous),
    });
  };

  return (
    <Section
      title={settingText(setting.key).label}
      meta={t('screens.settings.voices.hint')}
      variant="plain">
      <View role="radiogroup" aria-label={settingText(setting.key).label} className="gap-3">
        {rowsOf(setting.choices, wide ? WIDE_COLUMNS : COLUMNS).map((row) => (
          <View key={row.join('|')} className="flex-row gap-3">
            {row.map((choice, index) => (
              <View key={choice ?? `gap-${index}`} className="min-w-0 flex-1">
                {choice ? (
                  <VoiceCard
                    setting={setting}
                    choice={choice}
                    clip={previewClipId(setting.key, choice, siblings)}
                    preview={preview}
                    onChoose={choose}
                  />
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>
      {revealed !== null && host?.kind === 'host' ? (
        <View className="mt-3">
          <Notice
            icon="alert"
            title={t('screens.settings.install.host-hint', { name: choiceLabel(revealed) })}
            body={host.command}
          />
        </View>
      ) : null}
    </Section>
  );
}
