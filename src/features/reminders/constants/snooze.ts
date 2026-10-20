export const REMINDER_SNOOZE_MINUTES = [10, 30, 60] as const;

export type ReminderSnoozeMinutes = (typeof REMINDER_SNOOZE_MINUTES)[number];

export const REMINDER_SNOOZED_KEY = 'app.reminders.snoozed.';
