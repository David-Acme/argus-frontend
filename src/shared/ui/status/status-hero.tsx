import { clsx } from 'clsx';
import { View } from 'react-native';
import { useAnnounce } from '@/shared/hooks/use-announce';
import { layout, size, useThemeTokens, useWindowLayout, type AuraTone } from '@/shared/theme';
import { Aura } from '@/shared/ui/aura';
import { Chip } from '@/shared/ui/chip';
import { Presence, useHeroPresence, type PresenceCue, type PresenceState } from '@/shared/ui/presence';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text, type TextVariant } from '@/shared/ui/text';
import { StatusFade } from './status-fade';
import type { HeroScale, HeroStatusProps, StatusStat, StatusTone } from './status-types';

type StatsProps = { stats: readonly StatusStat[]; wrap: boolean };

type StatChipProps = { stat: StatusStat };

type HeroPresenceProps = { state: PresenceState; size: number; event?: PresenceCue };

const AURA: Record<StatusTone, AuraTone> = { calm: 'calm', attention: 'attn', alert: 'alert' };

const BAND_MAX = { maxWidth: layout.bandMax };

const STAT_SLOP = (size.target - size.chipStat) / 2;

function StatChip({ stat }: StatChipProps) {
  const chip = (
    <Chip size="stat" icon={stat.icon} value={stat.value} label={stat.label} tone={stat.tone} />
  );
  if (!stat.onPress) return chip;
  return (
    <PressableSurface
      a11y={{ label: `${stat.value} ${stat.label}`, role: 'link' }}
      onPress={stat.onPress}
      hitSlop={STAT_SLOP}
      className="rounded-full">
      {chip}
    </PressableSurface>
  );
}

function HeroPresence({ state, size: side, event }: HeroPresenceProps) {
  const paused = useHeroPresence();
  return <Presence state={state} size={side} paused={paused} event={event} />;
}

function Stats({ stats, wrap }: StatsProps) {
  if (stats.length === 0) return null;
  return (
    <View
      className={clsx('flex-row gap-2', wrap ? 'mt-status-stats-top flex-wrap' : 'flex-nowrap')}>
      {stats.map((stat) => (
        <StatChip key={`${stat.value} ${stat.label}`} stat={stat} />
      ))}
    </View>
  );
}

const PRESENCE_SIZE: Record<HeroScale | 'page', number> = {
  page: size.presenceHero,
  dense: size.presenceHeroDense,
  secondary: size.presenceHeroSmall,
};

function sentenceVariant(scale: HeroScale | undefined, wide: boolean): TextVariant {
  if (wide) return 'hero';
  return scale === 'secondary' ? 'heroSecondary' : 'heroCompact';
}

function HeroRow(props: HeroStatusProps & { wide: boolean }) {
  const { tone, sentence, meta, stats = [], presence, presenceEvent, scale, wide } = props;
  const presenceSize = PRESENCE_SIZE[scale ?? 'page'];
  return (
    <View role={tone === 'alert' ? 'alert' : undefined}>
      <View className="gap-status-hero-gap px-status-hero-pad pt-status-hero-pad flex-row items-center">
        {presence ? (
          <HeroPresence state={presence} size={presenceSize} event={presenceEvent} />
        ) : null}
        <StatusFade change={sentence} grow>
          <Text variant={sentenceVariant(scale, wide)} heading={2}>
            {sentence}
          </Text>
          <Text variant="meta">{meta}</Text>
        </StatusFade>
      </View>
      <Stats stats={stats} wrap />
    </View>
  );
}

function HeroBand(props: HeroStatusProps) {
  const { tone, sentence, meta, stats = [], presence, presenceEvent, aura, action } = props;
  const { elevation } = useThemeTokens();
  const card = { boxShadow: elevation.card };
  return (
    <View
      className="pt-status-band-top px-screen-column-x pb-status-band-bottom w-full self-center"
      style={BAND_MAX}>
      <View
        role={tone === 'alert' ? 'alert' : undefined}
        className="rounded-card bg-surface gap-status-band-gap px-status-band-x py-status-band-y web:focus-inset flex-row flex-nowrap items-center overflow-hidden"
        style={card}>
        <Aura tone={aura ?? AURA[tone]} mode="band" />
        {presence ? (
          <HeroPresence state={presence} size={size.presenceBand} event={presenceEvent} />
        ) : null}
        <StatusFade change={sentence} grow>
          <Text variant="heroBand" heading={2} numberOfLines={2}>
            {sentence}
          </Text>
          <Text variant="meta">{meta}</Text>
        </StatusFade>
        <Stats stats={stats} wrap={false} />
        {action}
      </View>
    </View>
  );
}

export function HeroStatus(props: HeroStatusProps) {
  const { windowClass } = useWindowLayout();
  useAnnounce(props.tone === 'alert' ? props.sentence : undefined);
  if (windowClass === 'expanded' || windowClass === 'wide') return <HeroBand {...props} />;
  return <HeroRow {...props} wide={windowClass === 'medium'} />;
}
