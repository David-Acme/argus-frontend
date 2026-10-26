import { View } from 'react-native';
import type { TranslationKey } from '@/core/types';
import { useAuthStore } from '@/core/stores';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useThemeTokens } from '@/shared/theme';
import { Avatar } from '@/shared/ui/avatar';
import type { AvatarTone } from '@/shared/ui/avatar';
import { FilterChip } from '@/shared/ui/chip';
import type { IconGlyph } from '@/shared/ui/icon';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Text } from '@/shared/ui/text';
import { RecentActivitySection } from '@/features/activity';
import { useAskArgus } from '@/features/home';
import { DevicesSection } from '@/features/sessions';
import { useWeek } from '@/features/profile/hooks/use-week';
import type { WeekStats } from '@/features/profile/model/week-stats';

type TileProps = { icon: IconGlyph; tone: AvatarTone; value: number; label: string };

type TilesProps = { stats: WeekStats };

const HELP = [
  {
    icon: 'shield',
    title: 'screens.profile.empty.guard.title',
    meta: 'screens.profile.empty.guard.meta',
  },
  {
    icon: 'cal',
    title: 'screens.profile.empty.remind.title',
    meta: 'screens.profile.empty.remind.meta',
  },
  {
    icon: 'chat',
    title: 'screens.profile.empty.answer.title',
    meta: 'screens.profile.empty.answer.meta',
  },
] as const satisfies readonly { icon: IconGlyph; title: TranslationKey; meta: TranslationKey }[];

const TRY: readonly TranslationKey[] = [
  'screens.profile.empty.try.remind',
  'screens.profile.empty.try.who',
  'screens.profile.empty.try.night',
];

function Tile({ icon, tone, value, label }: TileProps) {
  const { elevation } = useThemeTokens();
  const card = { boxShadow: elevation.card };
  return (
    <View className="bg-surface rounded-card min-w-0 flex-1 gap-3 p-4" style={card}>
      <Avatar icon={icon} tone={tone} />
      <View>
        <Text variant="heroCompact">{String(value)}</Text>
        <Text variant="meta" tone="2">
          {label}
        </Text>
      </View>
    </View>
  );
}

function Tiles({ stats }: TilesProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row gap-3">
      <Tile
        icon="check"
        tone="accent"
        value={stats.onTime}
        label={t(
          stats.onTime === 1
            ? 'screens.profile.week.on-time.one'
            : 'screens.profile.week.on-time.other'
        )}
      />
      <Tile
        icon="clock"
        tone="default"
        value={stats.pending}
        label={t(
          stats.pending === 1
            ? 'screens.profile.week.pending.one'
            : 'screens.profile.week.pending.other'
        )}
      />
    </View>
  );
}

function HelpSection() {
  const { t } = useTranslation();
  return (
    <Section title={t('screens.profile.empty.help-title')}>
      {HELP.map((item) => (
        <Row
          key={item.title}
          leading={<Avatar icon={item.icon} />}
          title={t(item.title)}
          meta={t(item.meta)}
        />
      ))}
    </Section>
  );
}

function EmptyWeek() {
  const { t } = useTranslation();
  const ask = useAskArgus();
  return (
    <>
      <View className="mt-section-top">
        <Notice
          presence="idle"
          title={t('screens.profile.empty.title')}
          body={t('screens.profile.empty.body')}
        />
      </View>
      <HelpSection />
      {ask ? (
        <Section title={t('screens.profile.empty.try-title')} variant="plain">
          <View className="flex-row flex-wrap gap-2">
            {TRY.map((key) => (
              <FilterChip
                key={key}
                size="suggestion"
                icon="mic"
                label={t(key)}
                selected={false}
                onPress={() => ask(t(key))}
              />
            ))}
          </View>
        </Section>
      ) : null}
    </>
  );
}

export function WeekPane() {
  const { t } = useTranslation();
  const { formatDayRange } = useDateFormatter();
  const { range, stats } = useWeek();
  const userId = useAuthStore((state) => state.user?.id ?? 0);
  const lively = stats !== null && stats.onTime + stats.pending > 0;
  return (
    <>
      {lively && stats ? (
        <Section
          title={t('screens.profile.week.title')}
          meta={formatDayRange(range.from, range.to)}
          variant="plain">
          <Tiles stats={stats} />
        </Section>
      ) : (
        <EmptyWeek />
      )}
      <DevicesSection />
      <RecentActivitySection userId={userId} fallback={lively ? <HelpSection /> : null} />
    </>
  );
}
