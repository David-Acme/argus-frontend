import { clsx } from 'clsx';
import { View } from 'react-native';
import { useAnnounce } from '@/shared/hooks/use-announce';
import { layout, size, useThemeTokens, useWindowLayout, type AuraTone } from '@/shared/theme';
import { Aura } from '@/shared/ui/aura';
import { Chip } from '@/shared/ui/chip';
import { Presence } from '@/shared/ui/presence';
import { Text, type TextVariant } from '@/shared/ui/text';
import { StatusFade } from './status-fade';
import type { HeroStatusProps, StatusStat, StatusTone } from './status-types';

type StatsProps = { stats: readonly StatusStat[]; wrap: boolean };

const AURA: Record<StatusTone, AuraTone> = { calm: 'calm', attention: 'attn', alert: 'alert' };

const BAND_MAX = { maxWidth: layout.bandMax };

function Stats({ stats, wrap }: StatsProps) {
  if (stats.length === 0) return null;
  return (
    <View
      className={clsx('flex-row gap-2', wrap ? 'mt-status-stats-top flex-wrap' : 'flex-nowrap')}>
      {stats.map((stat) => (
        <Chip
          key={`${stat.value} ${stat.label}`}
          size="stat"
          icon={stat.icon}
          value={stat.value}
          label={stat.label}
          tone={stat.tone}
        />
      ))}
    </View>
  );
}

function sentenceVariant(secondary: boolean | undefined, wide: boolean): TextVariant {
  if (wide) return 'hero';
  return secondary ? 'heroSecondary' : 'heroCompact';
}

function presenceSizeOf({ secondary, dense }: Pick<HeroStatusProps, 'secondary' | 'dense'>) {
  if (secondary) return size.presenceHeroSmall;
  return dense ? size.presenceHeroDense : size.presenceHero;
}

function HeroRow(props: HeroStatusProps & { wide: boolean }) {
  const { tone, sentence, meta, stats = [], presence, presenceEvent, secondary, wide } = props;
  const presenceSize = presenceSizeOf(props);
  return (
    <View role={tone === 'alert' ? 'alert' : undefined}>
      <View className="gap-status-hero-gap px-status-hero-pad pt-status-hero-pad flex-row items-center">
        {presence ? <Presence state={presence} size={presenceSize} event={presenceEvent} /> : null}
        <StatusFade change={sentence} grow>
          <Text variant={sentenceVariant(secondary, wide)} heading={2}>
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
  const { tone, sentence, meta, stats = [], presence, presenceEvent, action } = props;
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
        <Aura tone={AURA[tone]} mode="band" />
        {presence ? (
          <Presence state={presence} size={size.presenceBand} event={presenceEvent} />
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
