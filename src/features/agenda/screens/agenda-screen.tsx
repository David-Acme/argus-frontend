import { CalendarAgendaView } from '@/features/agenda/components/calendar-agenda-view';
import { CalendarEntryDetail } from '@/features/agenda/components/calendar-entry-detail';
import { CalendarEventForm } from '@/features/agenda/components/calendar-event-form';
import { CalendarDayList } from '@/features/agenda/components/calendar-day-list';
import { CalendarDayView } from '@/features/agenda/components/calendar-day-view';
import { CalendarHeader } from '@/features/agenda/components/calendar-header';
import { CalendarMonthView } from '@/features/agenda/components/calendar-month-view';
import { CalendarViewSwitcher } from '@/features/agenda/components/calendar-view-switcher';
import { CalendarWeekView } from '@/features/agenda/components/calendar-week-view';
import { EntryActionsMenu } from '@/features/agenda/components/entry-actions-menu';
import { IconButton } from '@/shared/components/ui/icon-button';
import { AppScreen } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import type { ICalendarEventFormRecord } from '@/core/interfaces';
import { viewCacheCoordinatorService } from '@/core/services/view-cache-coordinator.service';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { CALENDAR_DEFAULT_VIEW, IS_NATIVE, VIEW_CACHE_KEYS } from '@/shared/constants';
import { shouldUseAdaptiveMenuSheet } from '@/shared/libs/adaptive-menu-layout';
import { screenIn } from '@/shared/libs/animations';
import { calendarEntryEditHref, calendarEntryRecordId, entryPermissions } from '@/features/agenda/model/calendar-entry-actions';
import type { CalendarEntry, CalendarView } from '@/core/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { calendarMonthScope } from '@/core/services/view-cache';

export default function ScheduleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { windowClass, isCompact, isWide, isExpanded, isShort } = useWindowClass();
  const {
    new: newParam,
    edit: editParam,
    at: atParam,
  } = useLocalSearchParams<{ new?: string; edit?: string; at?: string }>();
  const initialDay = useMemo(() => {
    const at = Number(atParam);
    return date.startOfDay(Number.isFinite(at) && at > 0 ? new Date(at) : new Date());
  }, [atParam, date]);
  const [anchor, setAnchor] = useState(initialDay);
  const [view, setView] = useState<CalendarView>(() => CALENDAR_DEFAULT_VIEW[windowClass]);
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [eventFormOpen, setEventFormOpen] = useState(newParam === 'event');
  const [createAt, setCreateAt] = useState<Date | null>(() => {
    const at = Number(atParam);
    return newParam === 'event' && Number.isFinite(at) && at > 0 ? new Date(at) : null;
  });
  const [editingEventId, setEditingEventId] = useState('');
  const [pendingEditId, setPendingEditId] = useState(editParam ?? '');
  const [actionEntry, setActionEntry] = useState<CalendarEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<CalendarEntry | null>(null);
  const { can } = usePermissions();
  const usesActionSheet = shouldUseAdaptiveMenuSheet({
    isCompact,
    isExpanded,
    isNative: IS_NATIVE,
    isShort,
  });
  const usesContextMenu = IS_NATIVE && !usesActionSheet;
  const bottomNavInset = useBottomNavInset();

  const range = useMemo(() => date.rangeFor(view, anchor), [anchor, date, view]);
  const cachedEntries = useViewCacheRows<CalendarEntry>(
    VIEW_CACHE_KEYS.calendarEntries,
    calendarMonthScope(anchor),
  );
  useEffect(() => {
    viewCacheCoordinatorService.watchCalendarMonth(anchor);
  }, [anchor]);
  const entries = useMemo(
    () =>
      cachedEntries.filter(
        (entry) => entry.startsAt >= range.from && entry.startsAt <= range.to,
      ),
    [cachedEntries, range.from, range.to],
  );

  const selectedDayEntries = useMemo(
    () => entries.filter((entry) => date.sameDay(new Date(entry.startsAt), selectedDay)),
    [date, entries, selectedDay]
  );

  const editingEvent = useMemo<ICalendarEventFormRecord | null>(() => {
    const entry = entries.find(
      (candidate) => candidate.source === 'event' && calendarEntryRecordId(candidate) === editingEventId,
    );
    if (!entry || entry.source !== 'event') return null;
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
    [router]
  );

  const pendingEditEntry = pendingEditId
    ? entries.find(
        (candidate) =>
          candidate.source === 'event' && calendarEntryRecordId(candidate) === pendingEditId
      )
    : undefined;
  if (pendingEditEntry) {
    setPendingEditId('');
    setEditingEventId(pendingEditId);
    setEventFormOpen(true);
  }

  const openEntryActions = useCallback((entry: CalendarEntry) => setActionEntry(entry), []);
  const openEntryDetail = useCallback((entry: CalendarEntry) => setDetailEntry(entry), []);

  const renderActions = useCallback(
    (entry: CalendarEntry) => (
      <EntryActionsMenu
        entry={entry}
        {...entryPermissions(entry, can)}
        onEdit={editEntry}
      />
    ),
    [can, editEntry]
  );
  const renderContextMenu = useCallback(
    (entry: CalendarEntry, trigger: ReactElement) => (
      <EntryActionsMenu
        entry={entry}
        {...entryPermissions(entry, can)}
        onEdit={editEntry}
        contextTrigger={trigger}
      />
    ),
    [can, editEntry]
  );

  const viewLabels = useMemo<Record<CalendarView, string>>(
    () => ({
      day: t('screens.agenda.view-day'),
      week: t('screens.agenda.view-week'),
      month: t('screens.agenda.view-month'),
      agenda: t('screens.agenda.view-agenda'),
    }),
    [t]
  );

  const headerTitle = useMemo(
    () => (view === 'day' ? date.formatWeekday(anchor) : date.formatMonth(anchor)),
    [anchor, date, view]
  );
  const headerSubtitle = useMemo(
    () => (view === 'day' ? date.formatFullDate(anchor) : date.formatYear(anchor)),
    [anchor, date, view]
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      setAnchor((current) => {
        if (view === 'month') return date.addMonths(current, direction);
        if (view === 'week') return date.addDays(current, 7 * direction);
        return date.addDays(current, direction);
      });
    },
    [date, view]
  );

  const monthBody = (
    <>
      <View className={isWide ? 'min-w-0 flex-1' : undefined}>
        <CalendarMonthView
          anchor={anchor}
          selected={selectedDay}
          entries={entries}
          onSelectDay={setSelectedDay}
          fill={isExpanded && !isShort}
        />
      </View>
      {isWide ? (
        <View className="bg-divider/30 w-hairline self-stretch" />
      ) : (
        <View className="bg-divider/30 h-hairline w-full" />
      )}
      <View
        className={isWide ? 'min-h-0 w-[300px] shrink-0 gap-1.5 lg:w-[340px]' : 'gap-1.5'}>
        <View className="flex-row items-center justify-between pb-1.5">
          <Text className="text-caption font-medium">{date.formatAgendaDay(selectedDay)}</Text>
          <View className="flex-row items-center gap-2">
            {selectedDayEntries.length > 0 ? (
              <Text variant="caption">
                {t('screens.agenda.day-count', {
                  count: String(selectedDayEntries.length),
                })}
              </Text>
            ) : null}
            {can('calendar_event', 'create') ? (
              <Button
                variant="outline"
                size="sm"
                onPress={() => {
                  setEditingEventId('');
                  setEventFormOpen(true);
                }}>
                <Text>{t('screens.agenda.add-here')}</Text>
              </Button>
            ) : null}
          </View>
        </View>
        <CalendarDayList
          entries={selectedDayEntries}
          emptyLabel={t('screens.agenda.day-empty')}
          addLabel={
            can('calendar_event', 'create') ? t('screens.agenda.add-here') : undefined
          }
          onCreate={
            can('calendar_event', 'create')
              ? () => {
                  setEditingEventId('');
                  setEventFormOpen(true);
                }
              : undefined
          }
          renderActions={renderActions}
          onSelect={openEntryDetail}
          onLongPress={usesActionSheet ? openEntryActions : undefined}
          renderContextMenu={usesContextMenu ? renderContextMenu : undefined}
        />
      </View>
    </>
  );

  return (
    <AppScreen
      scrollable={false}>
      <Animated.View entering={screenIn} className="flex-1 gap-5">
        <View className="flex-row items-center justify-between">
          <IconButton
            icon="arrow-left"
            label={t('common.back')}
            onPress={() => router.replace('/')}
          />
          <Text variant="title">
            {t('screens.agenda.schedule')}
          </Text>
          {can('calendar_event', 'create') ? (
            <IconButton
              icon="plus"
              label={t('screens.agenda.new-event')}
              onPress={() => {
                setEditingEventId('');
                setEventFormOpen(true);
              }}
            />
          ) : (
            <View className="size-11" />
          )}
        </View>

        <CalendarHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          previousLabel={t('screens.agenda.previous')}
          nextLabel={t('screens.agenda.next')}
          todayLabel={t('screens.agenda.today')}
          onPrevious={() => step(-1)}
          onNext={() => step(1)}
          onToday={() => setAnchor(date.startOfDay(new Date()))}
        />

        <CalendarViewSwitcher view={view} labels={viewLabels} onChange={setView} />

        {view === 'month' ? (
          isWide ? (
            <View className="flex-1 flex-row items-stretch gap-5" style={{ paddingBottom: bottomNavInset }}>
              {monthBody}
            </View>
          ) : (
            <ScrollView
              className="flex-1"
              contentContainerClassName="gap-2"
              contentContainerStyle={{ paddingBottom: bottomNavInset }}
              showsVerticalScrollIndicator={false}>
              {monthBody}
            </ScrollView>
          )
        ) : null}

        {view === 'week' ? (
          <View className="min-h-0 flex-1" style={{ paddingBottom: bottomNavInset }}>
            <CalendarWeekView
              anchor={anchor}
              selected={anchor}
              entries={entries}
              onSelectDay={setAnchor}
              onSelect={openEntryDetail}
              onLongPress={usesActionSheet ? openEntryActions : undefined}
              renderContextMenu={usesContextMenu ? renderContextMenu : undefined}
            />
          </View>
        ) : null}

        {view === 'day' ? (
          <View className="min-h-0 flex-1">
            <CalendarDayView
              entries={entries}
              onSelect={openEntryDetail}
              onLongPress={usesActionSheet ? openEntryActions : undefined}
              renderContextMenu={usesContextMenu ? renderContextMenu : undefined}
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
              onSelect={openEntryDetail}
              onLongPress={usesActionSheet ? openEntryActions : undefined}
              renderContextMenu={usesContextMenu ? renderContextMenu : undefined}
              onCreateDay={
                can('calendar_event', 'create')
                  ? (day) => {
                      setSelectedDay(day);
                      setEditingEventId('');
                      setEventFormOpen(true);
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
