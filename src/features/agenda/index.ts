import { lazyScreen } from '@/shared/libs/lazy-screen';
export { AgendaEntryCard } from './components/agenda-entry-card';
export { DayPickerField } from './components/day-picker-field';
export { EntryActionsMenu } from './components/entry-actions-menu';
export { ReminderDialog } from './components/reminder-dialog';
export { RemindersSection } from './components/reminders-section';
export { useReminders } from './hooks/use-reminders';
export {
  agendaCheck,
  agendaMenu,
  agendaRights,
  type AgendaMenuAction,
  type AgendaRights,
} from './model/agenda-actions';
export {
  agendaItems,
  dayList,
  isOngoing,
  isOverdue,
  listLimit,
  nowList,
  projectNamesOf,
  upcomingReminders,
  type AgendaItem,
  type DayRange,
  type NowList,
} from './model/agenda-items';
export { dayTimeline, FREE_SLOT_RULES } from './model/agenda-timeline';
export { calendarEntryEditHref, entryPermissions } from './model/calendar-entry-actions';
export { byStart, CALENDAR_LENSES, isPendingEntry } from './model/calendar-optimistic';
export const AgendaScreen = lazyScreen(() => import('./screens/agenda-screen'), 'default');
export { removeEntry, toggleTask } from './services/calendar-entry-commands';
