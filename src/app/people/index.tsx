import { portraitPreviewService } from '@/core/services/portrait-preview.service';
import { useAuthStore } from '@/core/stores';
import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { filterPeople } from '@/core/services/view-cache';
import type { UserRole } from '@/core/types';
import { DashboardShell } from '@/shared/components/dashboard';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { VirtualList } from '@/shared/components/ui/virtual-list';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { portraitDataUri } from '@/shared/libs/portrait-preview';
import { toast } from '@/shared/libs/toast';
import { Redirect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { toastServiceError } from '@/shared/libs/service-error';

const ROLE_FILTERS: readonly (UserRole | 'all')[] = ['all', 'resident', 'guard', 'guest', 'owner'];

const roleKey = (role: UserRole) => `screens.users.role-${role}` as const;

const PERSON_ROW_HEIGHT = 60;

export default function PeopleDirectoryScreen() {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const authStatus = useAuthStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [selected, setSelected] = useState<IPeopleDirectoryCacheRow | null>(null);
  const [portraitUri, setPortraitUri] = useState<string | null>(null);
  const [portraitLoading, setPortraitLoading] = useState(false);
  const portraitRequest = useRef(0);
  const people = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const filtered = useMemo(() => filterPeople(people, { query: search, role }), [people, role, search]);
  const bottomInset = useBottomNavInset();
  const openPerson = useCallback((person: IPeopleDirectoryCacheRow) => {
    portraitRequest.current += 1;
    setPortraitUri(null);
    setPortraitLoading(false);
    setSelected(person);
  }, []);
  const closeDetails = useCallback(() => {
    portraitRequest.current += 1;
    setSelected(null);
    setPortraitUri(null);
    setPortraitLoading(false);
  }, []);
  const verifyPortrait = useCallback(async () => {
    if (!selected || portraitLoading) return;
    const request = portraitRequest.current + 1;
    portraitRequest.current = request;
    setPortraitLoading(true);
    setPortraitUri(null);
    const capability = await portraitPreviewService.createCapability(Number(selected.id));
    if (request !== portraitRequest.current) return;
    if (!capability.ok || !capability.info) {
      setPortraitLoading(false);
      toastServiceError(capability.errors);
      return;
    }
    const portrait = await portraitPreviewService.consume(capability.info.token);
    if (request !== portraitRequest.current) return;
    setPortraitLoading(false);
    if (!portrait.ok || !portrait.info) {
      toastServiceError(portrait.errors);
      return;
    }
    const dataUri = portraitDataUri(portrait.info);
    if (!dataUri) {
      toast.error(t('common.errors.unknown'));
      return;
    }
    setPortraitUri(dataUri);
  }, [portraitLoading, selected, t]);

  if (authStatus !== 'signed-in') return <Redirect href="/" />;
  if (currentUser?.role !== 'guard') return <Redirect href="/profile" />;

  return (
    <DashboardShell active="people" scrollable={false}>
      <View className="flex-1 gap-5">
        <View className="gap-1.5">
          <Text variant="h2">{t('screens.users.people-directory')}</Text>
          <Text className="text-foreground-secondary text-sm leading-5">
            {t('screens.users.people-directory-subtitle')}
          </Text>
        </View>

        <View className="gap-3">
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder={t('screens.users.search-people')}
            accessibilityLabel={t('screens.users.search-people')}
          />
          <View className="flex-row flex-wrap gap-2">
            {ROLE_FILTERS.map((item) => {
              const active = role === item;
              return (
                <Pressable
                  key={item}
                  className={active ? 'bg-foreground rounded-full px-3 py-1.5' : 'bg-surface-secondary rounded-full px-3 py-1.5'}
                  accessibilityRole="button"
                  onPress={() => setRole(item)}>
                  <Text className={active ? 'text-background text-xs font-medium' : 'text-foreground-secondary text-xs font-medium'}>
                    {item === 'all' ? t('screens.users.all-roles') : t(roleKey(item))}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="flex-1 gap-3">
          <SectionHeader title={t('screens.users.people-directory')} count={filtered.length} />
          {filtered.length > 0 ? (
            <Panel className="flex-1 p-1.5">
              <VirtualList
                data={filtered}
                keyOf={(person) => person.id}
                estimatedItemSize={PERSON_ROW_HEIGHT}
                paddingBottom={bottomInset}
                renderItem={(person) => (
                  <ListRow
                    icon="user"
                    title={[person.name, person.lastName].filter(Boolean).join(' ')}
                    subtitle={`${t(roleKey(person.role))} · ${person.isActive ? t('screens.users.active') : t('screens.users.inactive')}`}
                    chevron
                    onPress={() => openPerson(person)}
                  />
                )}
              />
            </Panel>
          ) : (
            <Panel>
              <EmptyState variant="inline" icon="users" title={t('screens.users.no-people')} />
            </Panel>
          )}
        </View>
      </View>

      <AdaptiveDialog
        open={selected !== null}
        onOpenChange={(open) => !open && closeDetails()}
        title={t('screens.users.person-details')}
        closeLabel={t('common.close')}
        contentClassName="sm:max-w-[390px]">
        {selected ? (
          <View className="gap-5 pb-1">
            <View className="flex-row items-center gap-3">
              <View className="bg-surface-secondary size-12 items-center justify-center rounded-full">
                <Icon name="user" className="text-foreground-secondary size-6" />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text variant="h4">{[selected.name, selected.lastName].filter(Boolean).join(' ')}</Text>
                <Text className="text-foreground-secondary text-sm">{t(roleKey(selected.role))}</Text>
              </View>
            </View>
            <View className="bg-surface-secondary gap-1 rounded-2xl px-3.5 py-3">
              <Text className="text-foreground-secondary text-xs">{t('screens.users.member-since', { date: date.formatDayMonth(new Date(selected.createdAt)) })}</Text>
              <Text className={selected.isActive ? 'text-success text-sm font-medium' : 'text-muted-foreground text-sm font-medium'}>
                {selected.isActive ? t('screens.users.active') : t('screens.users.inactive')}
              </Text>
            </View>
            <View className="gap-1.5">
              <Text className="text-sm font-medium">{t('screens.users.portrait-verification')}</Text>
              <Text className="text-muted-foreground text-sm leading-5">{t('screens.users.portrait-private')}</Text>
              {portraitUri ? (
                <Image
                  source={{ uri: portraitUri }}
                  className="mt-1 h-52 w-full rounded-2xl bg-surface-secondary"
                  resizeMode="cover"
                  accessibilityLabel={t('screens.users.portrait-verification')}
                />
              ) : (
                <Button
                  className="mt-1 self-start"
                  variant="outline"
                  loading={portraitLoading}
                  onPress={() => void verifyPortrait()}>
                  <Icon name="eye" className="size-4" />
                  <Text>{t('screens.users.verify-portrait')}</Text>
                </Button>
              )}
            </View>
          </View>
        ) : null}
      </AdaptiveDialog>
    </DashboardShell>
  );
}
