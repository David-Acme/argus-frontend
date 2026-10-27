import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useThemeTokens } from '@/shared/theme';
import { PressableSurface } from '@/shared/ui/pressable';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Text } from '@/shared/ui/text';
import { freeGaps } from '@/features/agenda/model/agenda-days';
import type { DayGroup, FreeGap } from '@/features/agenda/model/agenda-days';
import { durationText } from '@/features/agenda/model/agenda-lines';
import type { Category } from '@/features/agenda/model/agenda-lines';
import { MonthGrid } from '@/features/agenda/components/month-grid';
import { CATEGORIES } from '@/features/agenda/constants/agenda.constant';
import type { AsideMonth, ListContext } from '@/features/agenda/model/agenda-view';

export type AgendaAsideProps = {
  month: AsideMonth;
  shown: ReadonlySet<Category>;
  onToggle: (category: Category) => void;
  today: DayGroup;
  context: ListContext;
};

type ShowProps = Pick<AgendaAsideProps, 'shown' | 'onToggle'>;

type MonthCardProps = Pick<AgendaAsideProps, 'month'>;

type FreeProps = { gaps: readonly FreeGap[]; context: ListContext };

const SWATCH: Record<Category, string> = {
  event: 'bg-ev3-bar',
  task: 'bg-ev2-bar',
  shared: 'bg-ev4-bar',
};

const SHOW_LABEL: Record<Category, TranslationKey> = {
  event: 'screens.agenda.aside.show-event',
  task: 'screens.agenda.aside.show-task',
  shared: 'screens.agenda.aside.show-shared',
};

function MonthCard({ month }: MonthCardProps) {
  const { elevation } = useThemeTokens();
  const card = { boxShadow: elevation.card };
  return (
    <View className="rounded-card bg-surface mt-6 px-3 pt-4 pb-3" style={card}>
      <MonthGrid
        cells={month.cells}
        names={month.names}
        onPick={month.onPick}
        shift={month.shift}
        small
      />
    </View>
  );
}

function Show({ shown, onToggle }: ShowProps) {
  const { t } = useTranslation();
  return (
    <Section title={t('screens.agenda.aside.show')} variant="plain">
      {CATEGORIES.map((category) => (
        <PressableSurface
          key={category}
          a11y={{ label: t(SHOW_LABEL[category]), role: 'checkbox', checked: shown.has(category) }}
          onPress={() => onToggle(category)}
          className="min-h-10 flex-row items-center gap-3 px-1">
          <View
            className={clsx(
              'rounded-meter size-3.5',
              shown.has(category) ? SWATCH[category] : 'bg-fill-press'
            )}
          />
          <Text variant="feed" tone={shown.has(category) ? 'default' : '3'}>
            {t(SHOW_LABEL[category])}
          </Text>
        </PressableSurface>
      ))}
    </Section>
  );
}

function FreeToday({ gaps, context }: FreeProps) {
  const { t, date } = context;
  const total = gaps.reduce((sum, gap) => sum + gap.to - gap.from, 0);
  return (
    <Section title={t('screens.agenda.aside.free')} meta={durationText(total, t)}>
      {gaps.map((gap) => (
        <Row
          key={gap.id}
          title={date.formatTimeRange(new Date(gap.from), new Date(gap.to))}
          meta={t('screens.agenda.aside.between', { before: gap.before, after: gap.after })}
        />
      ))}
    </Section>
  );
}

export function asideBlocks({
  month,
  shown,
  onToggle,
  today,
  context,
}: AgendaAsideProps): ReactNode[] {
  const gaps = freeGaps(today);
  return [
    <MonthCard key="month" month={month} />,
    <Show key="show" shown={shown} onToggle={onToggle} />,
    gaps.length > 0 ? <FreeToday key="free" gaps={gaps} context={context} /> : null,
  ];
}
