import { authService } from '@/core/services/auth.service';
import { netService } from '@/core/services/net';
import { useAuthStore, useLocaleStore } from '@/core/stores';
import type {
  DashboardTab,
  LanguagePreference,
  NetPairedInstance,
  ThemePreference,
  UserRole,
} from '@/core/types';
import { DashboardShell } from '@/shared/components/dashboard';
import { SettingsGroup } from '@/shared/components/profile';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { ListRow } from '@/shared/components/ui/list-row';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import {
  DASHBOARD_TAB_ROUTE,
  IS_NATIVE,
  LANGUAGE_OPTIONS,
  THEME_ICONS,
  THEME_OPTIONS,
} from '@/shared/constants';
import { getThemePreference, setThemePreference } from '@/shared/hooks/use-theme-preference';
import { useTranslation } from '@/shared/hooks/use-translation';
import { confirm } from '@/shared/libs/confirm';
import { peopleAccessForRole } from '@/shared/libs/people-access';
import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

const roleKey = (role: UserRole) => `screens.users.role-${role}` as const;

export default function ProfileScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const languagePreference = useLocaleStore((state) => state.preference);
  const setLanguage = useLocaleStore((state) => state.setLanguage);
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);
  const [instance, setInstance] = useState<NetPairedInstance | null>(null);
  const [leaving, setLeaving] = useState(false);
  const access = useMemo(() => (user ? peopleAccessForRole(user.role) : null), [user]);

  const themeOptions = useMemo(
    () =>
      THEME_OPTIONS.map((value) => ({
        value,
        label: t(`screens.profile.theme.${value}`),
        icon: THEME_ICONS[value],
      })),
    [t],
  );
  const languageOptions = useMemo(
    () =>
      LANGUAGE_OPTIONS.map((value) => ({
        value,
        label: t(`common.language-name.${value}`),
      })),
    [t],
  );
  const pairedSince = instance?.pairedAt
    ? new Date(instance.pairedAt).toLocaleDateString(language, { dateStyle: 'medium' })
    : null;

  const goToTab = useCallback(
    (tab: DashboardTab) => router.replace(DASHBOARD_TAB_ROUTE[tab]),
    [router],
  );

  const changeTheme = useCallback((value: ThemePreference) => {
    setThemePreference(value);
    setTheme(value);
  }, []);

  const changeLanguage = useCallback(
    (value: LanguagePreference) => setLanguage(value),
    [setLanguage],
  );

  const signOut = useCallback(async () => {
    const accepted = await confirm({
      title: t('screens.profile.sign-out-confirm-title'),
      description: t('screens.profile.sign-out-confirm-description'),
      confirmLabel: t('screens.profile.sign-out'),
      intent: 'warning',
    });
    if (!accepted) return;
    setLeaving(true);
    await authService.logout();
    router.replace('/');
  }, [router, t]);

  const unpair = useCallback(async () => {
    const accepted = await confirm({
      title: t('screens.profile.unpair-confirm-title'),
      description: t('screens.profile.unpair-confirm-description'),
      confirmLabel: t('screens.profile.unpair'),
      intent: 'danger',
    });
    if (!accepted) return;
    setLeaving(true);
    await authService.logout();
    await netService.unpair();
    router.replace('/');
  }, [router, t]);

  useEffect(() => {
    let active = true;
    void netService.instance().then((current) => {
      if (active) setInstance(current);
    });
    return () => {
      active = false;
    };
  }, []);

  if (authStatus !== 'signed-in') return <Redirect href="/" />;

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
      <View className="w-full max-w-[640px] gap-6 self-center">
        <View className="flex-row items-center gap-4 pt-1">
          <View className="bg-surface-secondary size-16 items-center justify-center rounded-full">
            <Icon name="user" className="text-foreground-secondary size-7" />
          </View>
          <View className="min-w-0 flex-1 gap-0.5">
            <Text variant="title" numberOfLines={1}>
              {user?.name ?? '—'}
            </Text>
            <Text variant="label" className="text-foreground-secondary">
              {user ? t(roleKey(user.role)) : '—'}
            </Text>
          </View>
        </View>

        {access?.profileAction ? (
          <SettingsGroup title={t('screens.profile.people')}>
            <ListRow
              icon={access.profileAction === 'manage' ? 'shield-check' : 'user'}
              title={
                access.profileAction === 'manage'
                  ? t('screens.users.people-access')
                  : t('screens.users.people-directory')
              }
              subtitle={
                access.profileAction === 'manage'
                  ? t('screens.users.subtitle')
                  : t('screens.users.people-directory-subtitle')
              }
              chevron
              onPress={() => router.push(access.profileAction === 'manage' ? '/users' : '/people')}
            />
          </SettingsGroup>
        ) : null}

        {IS_NATIVE ? (
          <SettingsGroup title={t('screens.profile.devices')}>
            <ListRow
              icon="monitor"
              title={t('screens.profile.connect-device')}
              subtitle={t('screens.profile.connect-device-hint')}
              chevron
              onPress={() => router.push('/approve')}
            />
          </SettingsGroup>
        ) : null}

        <SettingsGroup title={t('screens.profile.appearance')}>
          <View className="p-1.5">
            <SegmentedControl
              options={themeOptions}
              value={theme}
              onChange={changeTheme}
              accessibilityLabel={t('screens.profile.theme-label')}
            />
          </View>
        </SettingsGroup>

        <SettingsGroup title={t('screens.profile.language')}>
          <View className="p-1.5">
            <SegmentedControl
              options={languageOptions}
              value={languagePreference}
              onChange={changeLanguage}
              accessibilityLabel={t('screens.profile.language-label')}
            />
          </View>
        </SettingsGroup>

        <SettingsGroup title={t('screens.profile.server')}>
          {instance ? (
            <ListRow
              icon="shield-check"
              title={t('screens.profile.server-address', { address: instance.ip })}
              subtitle={
                pairedSince ? t('screens.profile.server-paired', { date: pairedSince }) : undefined
              }
            />
          ) : null}
          <ListRow
            icon="unlink"
            title={t('screens.profile.unpair')}
            subtitle={t('screens.profile.unpair-hint')}
            destructive
            disabled={leaving}
            onPress={unpair}
          />
        </SettingsGroup>

        <Button variant="outline" size="lg" loading={leaving} onPress={signOut}>
          <Icon name="log-out" />
          <Text>{t('screens.profile.sign-out')}</Text>
        </Button>
      </View>
    </DashboardShell>
  );
}
