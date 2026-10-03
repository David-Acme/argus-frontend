import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ICalendarEventFormRecord } from '@/core/interfaces';
import type { CalendarEntry, CalendarView } from '@/core/types';
import { AppScreen } from '@/shared/components/layout';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Text } from '@/shared/components/ui/text';
import { CALENDAR_DEFAULT_VIEW, IS_NATIVE } from '@/shared/constants';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { shouldUseAdaptiveMenuSheet } from '@/shared/libs/adaptive-menu-layout';
import { screenIn } from '@/shared/libs/animations';
import { CalendarAgendaView } from '@/features/agenda/components/calendar-agenda-view';
import { CalendarDayView } from '@/features/agenda/components/calendar-day-view';
import { CalendarEntryDetail } from '@/features/agenda/components/calendar-entry-detail';
import { CalendarEventForm } from '@/features/agenda/components/calendar-event-form';
import { CalendarHeader } from '@/features/agenda/components/calendar-header';
import { CalendarViewSwitcher } from '@/features/agenda/components/calendar-view-switcher';
import { CalendarWeekView } from '@/features/agenda/components/calendar-week-view';
import { EntryActionsMenu } from '@/features/agenda/components/entry-actions-menu';
import { MonthPanel, type EntryHandlers } from '@/features/agenda/components/month-panel';
import { useAgendaEntries } from '@/features/agenda/hooks/use-agenda-entries';
import {
  calendarEntryEditHref,
  calendarEntryRecordId,
  entryPermissions,
} from '@/features/agenda/model/calendar-entry-actions';

type AgendaParams = { new?: string; edit?: string; at?: string };

function timestampParam(value: string | undefined): number | null {
  const at = Number(value);
  return Number.isFinite(at) && at > 0 ? at : null;
}

export default function ScheduleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { windowClass, isCompact, isWide, isExpanded, isShort } = useWindowClass();
  const { new: newParam, edit: editParam, at: atParam } = useLocalSearchParams<AgendaParams>();
  const atMs = timestampParam(atParam);
  const initialDay = useMemo(() => date.startOfDay(atMs == null ? new Date() : new Date(atMs)), [atMs, date]);
  const [anchor, setAnchor] = useState(initialDay);
  const [view, setView] = useState<CalendarView>(() => CALENDAR_DEFAULT_VIEW[windowClass]);
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [eventFormOpen, setEventFormOpen] = useState(newParam === 'event');
  const [createAt, setCreateAt] = useState<Date | null>(() =>
    newParam === 'event' && atMs != null ? new Date(atMs) : null,
  );
  const [editingEventId, setEditingEventId] = useState('');
  const [pendingEditId, setPendingEditId] = useState(editParam ?? '');
  const [actionEntry, setActionEntry] = useState<CalendarEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<CalendarEntry | null>(null);
  const { can } = usePermissions();
  const canCreate = can('calendar_event', 'create');
  const usesActionSheet = shouldUseAdaptiveMenuSheet({ isCompact, isExpanded, isNative: IS_NATIVE, isShort });
  const usesContextMenu = IS_NATIVE && !usesActionSheet;
  const bottomNavInset = useBottomNavInset();
  const { range, entries, selectedDayEntries } = useAgendaEntries({ view, anchor, selectedDay });

  const editingEvent = useMemo<ICalendarEventFormRecord | null>(() => {
    const entry = entries.find(
      (candidate) => candidate.source === 'event' && calendarEntryRecordId(candidate) === editingEventId,
    );
    if (!entry) return null;
    return {
      id: calendarEntryRecordId(entry),
      title: entry.title,
      startsAt: new Date(entry.startsAt),
      endsAt: entry.endsAt == null ? null : new Date(entry.endsAt),
      isAllDay: entry.isAllDay,
      location: entry.location ?? '',
      description: entry.description ?? '',
    };
  }, [editingEventId, entries]);

  const pendingEditEntry = pendingEditId
    ? entries.find((candidate) => candidate.source === 'event' && calendarEntryRecordId(candidate) === pendingEditId)
    : undefined;
  if (pendingEditEntry) {
    setPendingEditId('');
    setEditingEventId(pendingEditId);
    setEventFormOpen(true);
  }

  const viewLabels = useMemo<Record<CalendarView, string>>(
    () => ({
      day: t('screens.agenda.view-day'),
      week: t('screens.agenda.view-week'),
      month: t('screens.agenda.view-month'),
      agenda: t('screens.agenda.view-agenda'),
    }),
    [t],
  );

  const createEvent = useCallback((at: Date | null) => {
    setEditingEventId('');
    setCreateAt(at);
    setEventFormOpen(true);
  }, []);

  const editEntry = useCallback(
    (entry: CalendarEntry) => {
      setActionEntry(null);
      if (entry.source === 'event') {
        setEditingEventId(calendarEntryRecordId(entry));
        setEventFormOpen(true);
        return;
      }
      const href = calendarEntryEditHref(entry);
      if (href) router.push(href);
    },
    [router],
  );

  const renderActions = useCallback(
    (entry: CalendarEntry) => <EntryActionsMenu entry={entry} {...entryPermissions(entry, can)} onEdit={editEntry} />,
    [can, editEntry],
  );

  const renderContextMenu = useCallback(
    (entry: CalendarEntry, trigger: ReactElement) => (
      <EntryActionsMenu entry={entry} {...entryPermissions(entry, can)} onEdit={editEntry} contextTrigger={trigger} />
    ),
    [can, editEntry],
  );

  const handlers: EntryHandlers = {
    onSelect: setDetailEntry,
    onLongPress: usesActionSheet ? setActionEntry : undefined,
    renderActions,
    renderContextMenu: usesContextMenu ? renderContextMenu : undefined,
  };

  const step = useCallback(
    (direction: 1 | -1) => {
      setAnchor((current) => {
        if (view === 'month') return date.addMonths(current, direction);
        if (view === 'week') return date.addDays(current, 7 * direction);
        return date.addDays(current, direction);
      });
    },
    [date, view],
  );

  const switcher = <CalendarViewSwitcher view={view} labels={viewLabels} onChange={setView} />;

  return (
    <AppScreen scrollable={false}>
      <Animated.View entering={screenIn} className="flex-1 gap-5">
        <View className="flex-row items-center justify-between">
          <IconButton icon="arrow-left" label={t('common.back')} onPress={() => router.replace('/')} />
          <Text variant="title">{t('screens.agenda.schedule')}</Text>
          {canCreate ? (
            <IconButton icon="plus" label={t('screens.agenda.new-event')} onPress={() => createEvent(null)} />
          ) : (
            <View className="size-11" />
          )}
        </View>

        <CalendarHeader
          title={view === 'day' ? date.formatWeekday(anchor) : date.formatMonth(anchor)}
          subtitle={view === 'day' ? date.formatFullDate(anchor) : date.formatYear(anchor)}
          previousLabel={t('screens.agenda.previous')}
          nextLabel={t('screens.agenda.next')}
          todayLabel={t('screens.agenda.today')}
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
          onToday={() => {
            const today = date.startOfDay(new Date());
            setAnchor(today);
            setSelectedDay(today);
          }}
          accessory={isWide ? <View className="w-[340px] self-center">{switcher}</View> : undefined}
        />

        {isWide ? null : switcher}

        {view === 'month' ? (
          <MonthPanel
            anchor={anchor}
            selectedDay={selectedDay}
            entries={entries}
            dayEntries={selectedDayEntries}
            wide={isWide}
            fill={isExpanded && !isShort}
            handlers={handlers}
            onSelectDay={setSelectedDay}
            onCreate={canCreate ? () => createEvent(null) : undefined}
          />
        ) : null}

        {view === 'week' ? (
          <View className="min-h-0 flex-1" style={{ paddingBottom: bottomNavInset }}>
            <CalendarWeekView
              anchor={anchor}
              selected={anchor}
              entries={entries}
              onSelectDay={setAnchor}
              onSelect={handlers.onSelect}
              onLongPress={handlers.onLongPress}
              renderContextMenu={handlers.renderContextMenu}
            />
          </View>
        ) : null}

        {view === 'day' ? (
          <View className="min-h-0 flex-1">
            <CalendarDayView
              entries={entries}
              onSelect={handlers.onSelect}
              onLongPress={handlers.onLongPress}
              renderContextMenu={handlers.renderContextMenu}
            />
          </View>
        ) : null}

        {view === 'agenda' ? (
          <View className="min-h-0 flex-1">
            <CalendarAgendaView
              entries={entries}
              from={range.from}
              to={range.to}
              freeLabel={t('screens.agenda.day-empty')}
              renderActions={renderActions}
              onSelect={handlers.onSelect}
              onLongPress={handlers.onLongPress}
              renderContextMenu={handlers.renderContextMenu}
              onCreateDay={
                canCreate
                  ? (day) => {
                      setSelectedDay(day);
                      createEvent(null);
                    }
                  : undefined
              }
            />
          </View>
        ) : null}
      </Animated.View>

      <CalendarEventForm
        open={eventFormOpen}
        onOpenChange={(open) => {
          setEventFormOpen(open);
          if (!open) {
            setEditingEventId('');
            setCreateAt(null);
          }
        }}
        startsAt={createAt ?? selectedDay}
        event={editingEvent}
      />
      <CalendarEntryDetail
        entry={detailEntry}
        open={detailEntry !== null}
        onOpenChange={(open) => {
          if (!open) setDetailEntry(null);
        }}
      />
      {actionEntry ? (
        <EntryActionsMenu
          entry={actionEntry}
          {...entryPermissions(actionEntry, can)}
          onEdit={editEntry}
          open
          onOpenChange={(open) => {
            if (!open) setActionEntry(null);
          }}
        />
      ) : null}
    </AppScreen>
  );
}
