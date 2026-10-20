import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { screenIn } from '@/shared/libs/animations';
import { cn } from '@/shared/libs/utils';
import { useProximityPeople } from '@/features/proximity/hooks/use-proximity-people';
import {
  CONFIDENCE_LABEL,
  EVIDENCE_ICON,
  EVIDENCE_LABEL,
  ROOM_ROLE_LABEL,
  minutesAgo,
  type PersonRoom,
  type RoomPlace,
} from '@/features/proximity/model/proximity-people';

type PersonRoomCardProps = {
  person: PersonRoom;
  now: number;
};

const CLOCK_TICK_MS = 30_000;

const LEVEL_TONE = {
  sure: 'bg-success',
  likely: 'bg-warning',
  unsure: 'bg-muted-foreground',
} as const;

function usePlaceText() {
  const { t } = useTranslation();
  return (place: RoomPlace): { title: string; detail: string | null } => {
    const environment = place.environmentName;
    if (place.role) {
      const cameras =
        place.cameraNames.length > 0
          ? t('screens.proximity.people.place-cameras', { cameras: place.cameraNames.join(', ') })
          : null;
      return { title: t(ROOM_ROLE_LABEL[place.role]), detail: [environment, cameras].filter(Boolean).join(' · ') || null };
    }
    if (place.cameraName) {
      return { title: t('screens.proximity.people.place-near', { camera: place.cameraName }), detail: environment };
    }
    if (place.named) return { title: place.named, detail: environment };
    return { title: t('screens.proximity.people.place-unknown'), detail: environment };
  };
}

function PersonRoomCard({ person, now }: PersonRoomCardProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const placeText = usePlaceText();
  const place = placeText(person.place);
  const ago = minutesAgo(person.updatedAt, now);
  const fresh =
    ago === 0 ? t('screens.proximity.people.updated-now') : t('screens.proximity.people.updated-ago', { minutes: String(ago) });

  return (
    <View className="bg-surface-secondary dark:bg-card-secondary gap-3 rounded-2xl p-4">
      <View className="flex-row items-center gap-3">
        <View className="bg-card size-10 items-center justify-center rounded-full">
          <Icon name="user" className="text-foreground-secondary size-5" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="subhead" numberOfLines={1}>
            {person.name}
          </Text>
          <Text variant="label" numberOfLines={2}>
            {place.title}
          </Text>
          {place.detail ? (
            <Text variant="caption" numberOfLines={2}>
              {place.detail}
            </Text>
          ) : null}
        </View>
      </View>
      <View className="gap-1.5">
        <View className="flex-row items-center gap-2">
          <View className={cn('size-2 rounded-full', LEVEL_TONE[person.level])} />
          <Text variant="caption" className="text-foreground-secondary">
            {t(CONFIDENCE_LABEL[person.level], { percent: String(person.percent) })}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Icon name={EVIDENCE_ICON[person.evidence]} className="text-foreground-secondary size-4" />
          <Text variant="caption" className="text-foreground-secondary min-w-0 flex-1">
            {t(EVIDENCE_LABEL[person.evidence])}
          </Text>
        </View>
        <Text variant="micro">
          {[t('screens.proximity.people.since', { time: date.formatTime(new Date(person.since)) }), fresh].join(' · ')}
        </Text>
      </View>
    </View>
  );
}

export default function ProximityPeopleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const now = useNow(CLOCK_TICK_MS);
  const { allowed, rows, loaded, failed } = useProximityPeople();

  const body = !allowed ? (
    <EmptyState icon="lock" title={t('screens.proximity.people.not-allowed')} />
  ) : rows.length === 0 ? (
    <EmptyState
      icon="map-pin"
      title={failed && !loaded ? t('screens.proximity.load-failed') : t('screens.proximity.people.empty')}
      hint={t('screens.proximity.people.empty-hint')}
    />
  ) : (
    <Panel title={t('screens.proximity.people.list-title')} count={rows.length}>
      <View className="gap-3">
        {rows.map((person) => (
          <PersonRoomCard key={person.userId} person={person} now={now} />
        ))}
      </View>
    </Panel>
  );

  return (
    <AppScreen
      scrollable={false}
      bottomNav={false}
      header={
        <ScreenHeader
          title={t('screens.proximity.people.title')}
          subtitle={t('screens.proximity.people.subtitle')}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/settings/proximity'))}
        />
      }>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow pb-8">
        <Animated.View entering={screenIn} className="gap-5">
          <Text variant="caption" className="bg-surface-secondary dark:bg-card-secondary rounded-2xl px-4 py-3">
            {t('screens.proximity.people.privacy-note')}
          </Text>
          {body}
        </Animated.View>
      </ScrollView>
    </AppScreen>
  );
}
