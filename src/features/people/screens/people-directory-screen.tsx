import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { IPeopleDirectoryCacheRow } from '@/core/interfaces';
import { filterPeople } from '@/core/services/view-cache';
import type { UserRole } from '@/core/types';
import { AppScreen } from '@/shared/components/layout';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { FilterChips } from '@/shared/components/ui/filter-chips';
import { Input } from '@/shared/components/ui/input';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { Text } from '@/shared/components/ui/text';
import { InfiniteList } from '@/shared/components/ui/infinite-list';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { roleLabelOf } from '@/shared/libs/role-label';
import { PersonDetailsDialog } from '@/features/people/components/person-details-dialog';
import { usePortraitVerification } from '@/features/people/hooks/use-portrait-verification';

const ROLE_FILTERS: readonly (UserRole | 'all')[] = ['all', 'resident', 'guard', 'guest', 'owner'];


const PERSON_ROW_HEIGHT = 60;

const personKey = (person: IPeopleDirectoryCacheRow) => person.id;

export default function PeopleDirectoryScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | 'all'>('all');
  const [selected, setSelected] = useState<IPeopleDirectoryCacheRow | null>(null);
  const portrait = usePortraitVerification();
  const people = useViewCacheRows<IPeopleDirectoryCacheRow>(VIEW_CACHE_KEYS.peopleUsers);
  const filtered = useMemo(
    () => filterPeople(people, { query: search, role }),
    [people, role, search]
  );
  const bottomInset = useBottomNavInset();
  const { reset: resetPortrait, verify: verifyPortrait } = portrait;

  const openPerson = useCallback(
    (person: IPeopleDirectoryCacheRow) => {
      resetPortrait();
      setSelected(person);
    },
    [resetPortrait]
  );

  const renderPerson = useCallback(
    (person: IPeopleDirectoryCacheRow) => (
      <ListRow
        icon="user"
        title={[person.name, person.lastName].filter(Boolean).join(' ')}
        subtitle={`${roleLabelOf(person.role, t)} · ${person.isActive ? t('screens.users.active') : t('screens.users.inactive')}`}
        chevron
        onPress={() => openPerson(person)}
      />
    ),
    [openPerson, t]
  );

  const closeDetails = useCallback(() => {
    resetPortrait();
    setSelected(null);
  }, [resetPortrait]);

  return (
    <>
      <AppScreen scrollable={false}>
        <View className="flex-1 gap-5">
          <View className="gap-1.5">
            <Text variant="display">{t('screens.users.people-directory')}</Text>
            <Text variant="caption" className="text-foreground-secondary">
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
            <FilterChips
              options={ROLE_FILTERS.map((item) => ({
                value: item,
                label: item === 'all' ? t('screens.users.all-roles') : roleLabelOf(item, t),
              }))}
              value={role}
              onChange={setRole}
            />
          </View>

          <View className="flex-1 gap-3">
            <SectionHeader title={t('screens.users.people-directory')} count={filtered.length} />
            <Panel className="flex-1 p-1.5">
              {filtered.length > 0 ? (
                <InfiniteList
                  data={filtered}
                  keyOf={personKey}
                  estimatedItemSize={PERSON_ROW_HEIGHT}
                  paddingBottom={bottomInset}
                  renderItem={renderPerson}
                  recycle
                />
              ) : (
                <EmptyState variant="panel" icon="users" title={t('screens.users.no-people')} />
              )}
            </Panel>
          </View>
        </View>
      </AppScreen>

      <PersonDetailsDialog
        person={selected}
        roleLabel={selected ? roleLabelOf(selected.role, t) : ''}
        portraitUri={portrait.uri}
        portraitLoading={portrait.loading}
        onVerify={() => {
          if (selected && !portrait.loading) void verifyPortrait(selected.id);
        }}
        onClose={closeDetails}
      />
    </>
  );
}
