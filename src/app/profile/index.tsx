import { useAuthStore } from '@/core/stores';
import type { DashboardTab, UserRole } from '@/core/types';
import { DashboardShell } from '@/shared/components/dashboard';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { DASHBOARD_TAB_ROUTE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { peopleAccessForRole } from '@/shared/libs/people-access';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';

const roleKey = (role: UserRole) => `screens.users.role-${role}` as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const access = useMemo(() => (user ? peopleAccessForRole(user.role) : null), [user]);
  const goToTab = useCallback(
    (tab: DashboardTab) => router.replace(DASHBOARD_TAB_ROUTE[tab]),
    [router],
  );

  if (authStatus !== 'signed-in') return <Redirect href="/" />;

  const actionLabel =
    access?.profileAction === 'manage'
      ? t('screens.users.people-access')
      : access?.profileAction === 'directory'
        ? t('screens.users.people-directory')
        : null;
  const actionRoute = access?.profileAction === 'manage' ? '/users' : '/people';

  return (
    <DashboardShell
      active="profile"
      labels={{
        home: t('screens.home.home'),
        schedule: t('screens.agenda.schedule'),
        projects: t('screens.projects.title'),
        profile: t('screens.home.profile'),
      }}
      composeLabel={t('screens.home.compose')}
      onNavigate={goToTab}
      onCompose={() => router.push('/agenda?new=event')}>
      <View className="gap-5">
        <View className="gap-1.5">
          <Text variant="h2">{t('screens.users.profile-title')}</Text>
          <Text className="text-foreground-secondary text-sm leading-5">
            {t('screens.users.profile-subtitle')}
          </Text>
        </View>

        <View className="border-border-subtle gap-4 border-b pb-5">
          <View className="flex-row items-start gap-4">
            <View className="min-w-0 flex-1 gap-1.5 pt-1">
              <Text className="text-3xl font-semibold tracking-tight" numberOfLines={1}>
                {user?.name ?? '—'}
              </Text>
              <Text className="text-foreground-secondary text-sm">
                {user ? t(roleKey(user.role)) : '—'}
              </Text>
              <View className="bg-success/10 mt-1 self-start flex-row items-center gap-1.5 rounded-full px-2.5 py-1">
                <View className="bg-success size-1.5 rounded-full" />
                <Text className="text-success text-xs font-medium">{t('screens.users.account-status')}</Text>
              </View>
            </View>
            <View className="bg-surface-secondary size-16 items-center justify-center rounded-full">
              <Icon name="user" className="text-foreground-secondary size-7" />
            </View>
          </View>
          <Text className="text-muted-foreground text-sm leading-5">
            {t('screens.users.account-subtitle')}
          </Text>
        </View>

        {actionLabel ? (
          <Pressable
            className="bg-card border-border-subtle flex-row items-center gap-3 rounded-2xl border px-4 py-4"
            accessibilityRole="button"
            onPress={() => router.push(actionRoute)}>
            <View className="bg-surface-secondary size-10 items-center justify-center rounded-full">
              <Icon name={access?.profileAction === 'manage' ? 'shield-check' : 'user'} className="text-foreground-secondary size-5" />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text>{actionLabel}</Text>
              <Text className="text-muted-foreground text-xs">
                {access?.profileAction === 'manage'
                  ? t('screens.users.subtitle')
                  : t('screens.users.people-directory-subtitle')}
              </Text>
            </View>
            <Icon name="chevron-right" className="text-muted-foreground size-5" />
          </Pressable>
        ) : null}

      </View>
    </DashboardShell>
  );
}
