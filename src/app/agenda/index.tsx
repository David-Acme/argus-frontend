import { useAuthStore, useOnboardingStore } from '@/core/stores';
import {
  CalendarAgendaView,
  CalendarEntryDetail,
  CalendarEventForm,
  CalendarDayList,
  CalendarDayView,
  CalendarHeader,
  CalendarMonthView,
  CalendarViewSwitcher,
  CalendarWeekView,
  EntryActionsMenu,
} from '@/shared/components/calendar';
import { DashboardIconButton, DashboardShell } from '@/shared/components/dashboard';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { calendarEventService } from '@/core/services/calendar-event.service';
import { useCachedRows } from '@/shared/hooks/use-cached-rows';
import { useCalendarEntries } from '@/shared/hooks/use-calendar-entries';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useObservable } from '@/shared/hooks/use-observable';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import {
  CALENDAR_DEFAULT_VIEW,
  DASHBOARD_TAB_ROUTE,
  IS_NATIVE,
  VIEW_CACHE_KEYS,
} from '@/shared/constants';
import { shouldUseAdaptiveMenuSheet } from '@/shared/libs/adaptive-menu-layout';
import { screenIn } from '@/shared/libs/animations';
import { calendarEntryRecordId } from '@/shared/libs/calendar-entry-actions';
import type { CalendarEntry, CalendarView, DashboardTab } from '@/core/types';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

/** Hours the day/week grids show: a working day, not 24 empty rows. */
export default function ScheduleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { windowClass, isCompact, isWide, isExpanded, isShort } = useWindowClass();
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const voiceEnabled = useOnboardingStore((state) => state.voiceEnabled);
  const [anchor, setAnchor] = useState(() => date.startOfDay(new Date()));
  const [view, setView] = useState<CalendarView>(() => CALENDAR_DEFAULT_VIEW[windowClass]);
  const [selectedDay, setSelectedDay] = useState(() => date.startOfDay(new Date()));
  const { new: newParam } = useLocalSearchParams<{ new?: string }>();
  const [eventFormOpen, setEventFormOpen] = useState(newParam === 'event');
  const [editingEventId, setEditingEventId] = useState('');
  const [actionEntry, setActionEntry] = useState<CalendarEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<CalendarEntry | null>(null);
  const { can } = usePermissions();
  const userKey = user?.id == null ? '' : String(user.id);
  const usesActionSheet = shouldUseAdaptiveMenuSheet({
    isCompact,
    isExpanded,
    isNative: IS_NATIVE,
    isShort,
  });
  const usesContextMenu = IS_NATIVE && !usesActionSheet;

  const range = useMemo(() => date.rangeFor(view, anchor), [anchor, date, view]);
  // The day list carries merged entries; editing needs the row itself, so the
  // month range is observed alongside.
  const calendarEvents = useObservable(
    () => calendarEventService.observeRange(range.from, range.to),
    [],
    [range.from, range.to]
  );
  const { entries: liveEntries, ready: entriesReady } = useCalendarEntries({
    from: range.from,
    to: range.to,
    userId: userKey,
  });
  // The window that is on screen is rehydrated from the last visit, so paging
  // back to it never blinks through an empty grid.
  const entries = useCachedRows(
    VIEW_CACHE_KEYS.calendarEntries,
    liveEntries,
    entriesReady,
    `${userKey}.${view}.${range.from}`
  );

  const selectedDayEntries = useMemo(
    () => entries.filter((entry) => date.sameDay(new Date(entry.startsAt), selectedDay)),
    [date, entries, selectedDay]
  );

  const editEntry = useCallback((entry: CalendarEntry) => {
    if (entry.source !== 'event') return;
    setActionEntry(null);
    setEditingEventId(calendarEntryRecordId(entry));
    setEventFormOpen(true);
  }, []);

  const openEntryActions = useCallback((entry: CalendarEntry) => setActionEntry(entry), []);
  const openEntryDetail = useCallback((entry: CalendarEntry) => setDetailEntry(entry), []);

  const renderActions = useCallback(
    (entry: CalendarEntry) => (
      <EntryActionsMenu
        entry={entry}
        canEdit={can(entry.source === 'task' ? 'project_task' : 'calendar_event', 'update')}
        canDelete={can(entry.source === 'task' ? 'project_task' : 'calendar_event', 'delete')}
        onEdit={editEntry}
      />
    ),
    [can, editEntry]
  );
  const renderContextMenu = useCallback(
    (entry: CalendarEntry, trigger: ReactElement) => (
      <EntryActionsMenu
        entry={entry}
        canEdit={can(entry.source === 'task' ? 'project_task' : 'calendar_event', 'update')}
        canDelete={can(entry.source === 'task' ? 'project_task' : 'calendar_event', 'delete')}
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

  // Title is the scale you are in, subtitle the context around it: "August" /
  // "2026" reads faster than "August 2026" on one line.
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

  const goToTab = useCallback(
    (tab: DashboardTab) => router.replace(DASHBOARD_TAB_ROUTE[tab]),
    [router]
  );
  const handleCompose = useCallback(() => {
    if (voiceEnabled) router.push('/welcome/voice');
  }, [router, voiceEnabled]);

  // The dashboard routes are only reachable with a session; the root screen
  // owns the onboarding decision, so an unauthenticated hit bounces there.
  if (authStatus !== 'signed-in') return <Redirect href="/" />;

  return (
    <DashboardShell
      active="schedule"
      labels={{
        home: t('screens.home.home'),
        schedule: t('screens.agenda.schedule'),
        projects: t('screens.projects.title'),
        profile: t('screens.home.profile'),
      }}
      composeLabel={t('screens.home.compose')}
      onNavigate={goToTab}
      onCompose={handleCompose}
      scrollable={false}>
      <Animated.View entering={screenIn} className="flex-1 gap-5">
        <View className="flex-row items-center justify-between">
          <DashboardIconButton
            icon="arrow-left"
            label={t('common.back')}
            onPress={() => router.replace('/')}
          />
          <Text className="text-[22px] font-semibold tracking-tight">
            {t('screens.agenda.schedule')}
          </Text>
          {can('calendar_event', 'create') ? (
            <DashboardIconButton
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
          <View className={isWide ? 'flex-1 flex-row items-stretch gap-5' : 'gap-2'}>
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
                <Text className="text-[13px] font-medium">{date.formatAgendaDay(selectedDay)}</Text>
                <View className="flex-row items-center gap-2">
                  {selectedDayEntries.length > 0 ? (
                    <Text className="text-muted-foreground text-[12px]">
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
          </View>
        ) : null}

        {view === 'week' ? (
          <View className="min-h-0 flex-1">
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
          if (!open) setEditingEventId('');
        }}
        startsAt={selectedDay}
        event={calendarEvents.find((item) => item.id === editingEventId) ?? null}
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
          canEdit={can(actionEntry.source === 'task' ? 'project_task' : 'calendar_event', 'update')}
          canDelete={can(
            actionEntry.source === 'task' ? 'project_task' : 'calendar_event',
            'delete'
          )}
          onEdit={editEntry}
          open
          onOpenChange={(open) => {
            if (!open) setActionEntry(null);
          }}
        />
      ) : null}
    </DashboardShell>
  );
}
