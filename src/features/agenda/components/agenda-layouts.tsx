import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { AgendaItem } from '@/core/types';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useTranslation } from '@/shared/hooks/use-translation';
import { size, useWindowLayout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Screen, ScreenColumn, ScreenColumns } from '@/shared/ui/screen';
import { Sheet } from '@/shared/ui/sheet';
import type { AgendaScreenState } from '@/features/agenda/hooks/use-agenda-screen';
import { useCalendarCells, useMonthShift } from '@/features/agenda/hooks/use-calendar-cells';
import { useDayNames } from '@/features/agenda/hooks/use-day-names';
import { dayGroup, dayRange, nextDays, restOfDay } from '@/features/agenda/model/agenda-days';
import { kindWords } from '@/features/agenda/model/agenda-lines';
import { calendarEntryRecordId } from '@/features/agenda/model/calendar-entry-actions';
import { asideBlocks } from '@/features/agenda/components/agenda-aside';
import { AgendaBody, AgendaHead } from '@/features/agenda/components/agenda-body';
import { AgendaGuide, NextDays } from '@/features/agenda/components/agenda-guide';
import { CalendarEventShareDialog } from '@/features/agenda/components/calendar-event-share-dialog';
import { detailBlocks } from '@/features/agenda/components/item-detail';
import { ItemSheet } from '@/features/agenda/components/item-sheet';

export type AgendaLayoutProps = { state: AgendaScreenState };

type DetailProps = AgendaLayoutProps & { item: AgendaItem | null; titled: boolean };

type NewButtonProps = AgendaLayoutProps & { phone: boolean };

function NewButton({ state, phone }: NewButtonProps) {
  const { t } = useTranslation();
  const bottom = useBottomNavInset();
  const [first] = state.kinds;
  if (!first) return null;
  const place = phone ? { bottom } : undefined;
  return (
    <View className={phone ? 'absolute right-4' : 'absolute right-6 bottom-6'} style={place}>
      <Button
        iconOnly
        fab
        icon="plus"
        label={t('screens.agenda.page.new')}
        onPress={() => state.create(first)}
      />
    </View>
  );
}

function useDetail({ state, item, titled }: DetailProps): ReactNode[] {
  const date = useDateFormatter();
  const { context, visible } = state;
  if (!item) return [];
  return detailBlocks({
    item,
    rest: restOfDay(visible, item, date),
    upcoming: nextDays({ items: visible, from: item.startsAt, now: context.now }, date),
    context,
    handlers: state.handlersFor(item),
    titled,
  });
}

function Overlays({ state }: AgendaLayoutProps) {
  const { sharing } = state;
  return (
    <>
      <ItemSheet
        form={state.form}
        kinds={state.kinds}
        projects={state.plan.projects}
        now={state.plan.now}
      />
      {sharing ? (
        <CalendarEventShareDialog
          open
          onOpenChange={(open) => {
            if (!open) state.stopSharing();
          }}
          eventId={calendarEntryRecordId(sharing.entry)}
          eventTitle={sharing.title}
          ownerId={sharing.entry.ownerId ?? ''}
        />
      ) : null}
    </>
  );
}

export function PhoneAgenda({ state }: AgendaLayoutProps) {
  const { context, chosen } = state;
  const detail = useDetail({ state, item: chosen, titled: false });
  return (
    <View className="flex-1">
      <Screen>
        <AgendaHead state={state} />
        <AgendaBody state={state} />
      </Screen>
      <NewButton state={state} phone />
      <Sheet
        open={chosen !== null}
        onClose={state.close}
        title={chosen ? kindWords(chosen, context) : ''}
        variant="detail">
        <View>{detail}</View>
      </Sheet>
      <Overlays state={state} />
    </View>
  );
}

function AsideColumn({ state }: AgendaLayoutProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const names = useDayNames();
  const cells = useCalendarCells(state);
  const shift = useMonthShift(state);
  const today = dayGroup(state.visible, dayRange(state.plan.now, date), state.plan.now);
  return (
    <ScreenColumn width={size.columnAside} label={t('screens.agenda.page.calendar')}>
      {asideBlocks({
        month: { cells: cells.month, names, shift, onPick: state.pick },
        shown: state.shown,
        onToggle: state.toggleShown,
        today,
        context: state.context,
      })}
    </ScreenColumn>
  );
}

function DetailColumn({ state }: AgendaLayoutProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const item = state.chosen ?? state.first;
  const detail = useDetail({ state, item, titled: true });
  const guide = [
    <AgendaGuide key="guide" />,
    <NextDays
      key="next"
      groups={nextDays({ items: state.visible, from: state.selected, now: state.plan.now }, date)}
      context={state.context}
    />,
  ];
  return (
    <ScreenColumn label={t('screens.agenda.page.detail')}>{item ? detail : guide}</ScreenColumn>
  );
}

export function PanesAgenda({ state }: AgendaLayoutProps) {
  const { t } = useTranslation();
  const { windowClass } = useWindowLayout();
  const desktop = windowClass === 'expanded' || windowClass === 'wide';
  const current = (state.chosen ?? state.first)?.id ?? null;
  const panes = { ...state, context: { ...state.context, selected: current } };
  return (
    <>
      <Screen columns="panes">
        <ScreenColumns>
          {desktop ? <AsideColumn state={panes} /> : null}
          <View className="relative min-w-0 flex-1">
            <ScreenColumn label={t('screens.agenda.page.list')}>
              <AgendaHead state={panes} />
              <AgendaBody state={panes} />
            </ScreenColumn>
            <NewButton state={panes} phone={false} />
          </View>
          <DetailColumn state={panes} />
        </ScreenColumns>
      </Screen>
      <Overlays state={state} />
    </>
  );
}
