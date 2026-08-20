import { useAuthStore, useOnboardingStore } from '@/core/stores';
import { useDashboardData } from '@/shared/hooks/use-dashboard-data';
import {
  DashboardBottomNav,
  DashboardIconButton,
  ScheduleTimeline,
  WeekStrip,
} from '@/shared/components/dashboard';
import type { WeekStripDay } from '@/shared/components/dashboard';
import type { DashboardTab, ScheduleEntry } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { DASHBOARD_MEMBERS } from '@/shared/constants';
import { screenIn } from '@/shared/libs/animations';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek(date: Date): Date {
  const value = startOfDay(date);
  // Monday-first, matching the reference strip.
  const weekday = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - weekday);
  return value;
}

function addDays(date: Date, amount: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

function sameDay(left: Date, right: Date): boolean {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
}

function formatHour(hour: number, locale: string): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).format(date);
}

function formatRange(start: Date, minutes: number, locale: string): string {
  const format = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const end = new Date(start.getTime() + minutes * 60_000);
  return `${format.format(start)} - ${format.format(end)}`;
}

function formatMonth(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

export default function ScheduleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslation();
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const voiceEnabled = useOnboardingStore((state) => state.voiceEnabled);
  const { reminders } = useDashboardData(user?.id ?? null);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const locale = language === 'es' ? 'es-PE' : 'en-US';

  const days = useMemo<WeekStripDay[]>(() => {
    const monday = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, offset) => {
      const date = addDays(monday, offset);
      return {
        date,
        weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' })
          .format(date)
          .replace('.', ''),
        day: new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date),
      };
    });
  }, [locale, selectedDate]);

  const dayReminders = useMemo(
    () => reminders.filter((reminder) => sameDay(reminder.scheduledAt, selectedDate)),
    [reminders, selectedDate],
  );

  // Template entries so the timeline reads correctly before any reminder is
  // synced. Replaced one-for-one by real data when it exists.
  const templateEntries = useMemo<ScheduleEntry[]>(
    () => [
      {
        title: t('screens.home.preview-task-1'),
        time: '09:15 - 10:15',
        hour: 9,
        status: 'active',
        members: DASHBOARD_MEMBERS[0],
      },
      {
        title: t('screens.home.preview-task-2'),
        time: '11:15 - 13:00',
        hour: 11,
        status: 'upcoming',
        members: DASHBOARD_MEMBERS[1],
      },
      {
        title: t('screens.home.preview-task-3'),
        time: '14:00 - 18:00',
        hour: 14,
        status: 'upcoming',
        members: DASHBOARD_MEMBERS[2],
        note: t('screens.agenda.empty-hint'),
      },
      {
        title: t('screens.home.project-reminders'),
        time: '19:00 - 20:20',
        hour: 19,
        status: 'complete',
        members: DASHBOARD_MEMBERS[0],
      },
    ],
    [t],
  );

  const entries = useMemo<ScheduleEntry[]>(() => {
    if (dayReminders.length === 0) {
      return sameDay(selectedDate, new Date()) ? templateEntries : [];
    }
    return dayReminders.map((reminder) => ({
      title: reminder.title,
      time: formatRange(reminder.scheduledAt, 60, locale),
      hour: reminder.scheduledAt.getHours(),
      status: reminder.isCompleted ? ('complete' as const) : ('upcoming' as const),
      members: [],
    }));
  }, [dayReminders, locale, selectedDate, templateEntries]);

  const goToTab = useCallback(
    (tab: DashboardTab) => {
      if (tab === 'home') router.replace('/');
      else router.replace('/agenda');
    },
    [router],
  );
  const handleCompose = useCallback(() => {
    if (voiceEnabled) router.push('/welcome/voice');
  }, [router, voiceEnabled]);

  if (authStatus === 'signed-out') return <Redirect href="/" />;
  if (authStatus !== 'signed-in') return <View className="bg-background flex-1" />;


  return (
    <View className="bg-background flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-36"
        showsVerticalScrollIndicator={false}>
        <Animated.View
          entering={screenIn}
          className="w-full max-w-3xl self-center gap-5 px-5"
          style={{ paddingTop: insets.top + 18 }}>
          <View className="flex-row items-center justify-between">
            <DashboardIconButton
              icon="arrow-left"
              label={t('common.back')}
              onPress={() => router.replace('/')}
            />
            <Text className="text-[22px] font-semibold tracking-tight">
              {t('screens.agenda.schedule')}
            </Text>
            <DashboardIconButton
              icon="more-horizontal"
              label={t('screens.agenda.options')}
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('screens.agenda.month-picker')}
            className="flex-row items-center gap-1.5 self-start active:opacity-60">
            <Text className="text-[19px] font-semibold capitalize tracking-tight">
              {formatMonth(selectedDate, locale)}
            </Text>
            <View className="bg-card size-6 items-center justify-center rounded-full shadow-sm shadow-black/[0.08]">
              <Icon name="chevron-down" className="text-foreground-secondary size-3.5" />
            </View>
          </Pressable>

          <WeekStrip days={days} selected={selectedDate} onSelect={setSelectedDate} />

          <View className="bg-divider/40 h-hairline w-full" />

          {entries.length > 0 ? (
            <ScheduleTimeline
              entries={entries}
              formatHour={(hour) => formatHour(hour, locale)}
            />
          ) : (
            <View className="bg-card items-center gap-3 rounded-[24px] px-6 py-10 shadow-md shadow-black/[0.06]">
              <View className="bg-surface-secondary size-12 items-center justify-center rounded-full">
                <Icon name="calendar" className="text-foreground-secondary size-5" />
              </View>
              <Text className="text-center text-base font-semibold">
                {t('screens.agenda.empty')}
              </Text>
              <Text className="text-foreground-secondary max-w-xs text-center text-sm leading-5">
                {t('screens.agenda.empty-hint')}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <DashboardBottomNav
        active="insights"
        labels={{
          home: t('screens.home.home'),
          insights: t('screens.home.insights'),
          messages: t('screens.home.messages'),
          profile: t('screens.home.profile'),
        }}
        composeLabel={t('screens.home.compose')}
        bottomInset={insets.bottom}
        onNavigate={goToTab}
        onCompose={handleCompose}
      />
    </View>
  );
}
