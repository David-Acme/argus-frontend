import { mock } from 'bun:test';
import type { ReactNode } from 'react';
import type {
  GuardEnvironment,
  GuardEpisode,
  GuardExpectedGuest,
  MaintenanceWindow,
} from '@/core/types';
import { createDateFormatter } from '@/shared/hooks/use-date-formatter/date';
import { screenFocus } from '../../../shared/ui/screen-focus';
import { NOW } from '../security-fixtures';
import '../../../shared/ui/translation-stub';

type Access = {
  owner: boolean;
  setMode: boolean;
  review: boolean;
  manageGuests: boolean;
  maintenance: boolean;
  watch: boolean;
  talk: boolean;
  create: boolean;
};

type CameraRow = { id: string; name: string };

export const routes: string[] = [];

export const calls: string[] = [];

export const access: Access = {
  owner: true,
  setMode: true,
  review: true,
  manageGuests: true,
  maintenance: true,
  watch: true,
  talk: true,
  create: true,
};

export const data = {
  cameras: [
    { id: '3', name: 'Patio trasero' },
    { id: '7', name: 'Dormitorio' },
  ] as CameraRow[],
  windows: [] as MaintenanceWindow[],
  environments: [] as GuardEnvironment[],
  guests: [] as GuardExpectedGuest[],
  episodes: [] as GuardEpisode[],
};

export function resetStubs(): void {
  routes.length = 0;
  calls.length = 0;
  Object.assign(access, {
    owner: true,
    setMode: true,
    review: true,
    manageGuests: true,
    maintenance: true,
    watch: true,
    talk: true,
    create: true,
  });
  data.windows = [];
  data.environments = [];
  data.guests = [];
  data.episodes = [];
}

const dates = createDateFormatter('es', {
  languageTag: 'es-PE',
  regionCode: 'PE',
  uses24hourClock: true,
  firstWeekday: 2,
  timeZone: null,
});

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({
    push: (href: string) => routes.push(href),
    replace: (href: string) => routes.push(`replace:${href}`),
    back: () => routes.push('back'),
    canGoBack: () => true,
    setParams: () => undefined,
  }),
  useIsFocused: () => screenFocus.focused,
  useFocusEffect: () => undefined,
}));

mock.module('@/shared/hooks/use-date-formatter', () => ({ useDateFormatter: () => dates }));

mock.module('@/shared/hooks/use-now', () => ({ useNow: () => NOW }));

mock.module('@/shared/hooks/use-cached-rows', () => ({
  useViewCacheRows: () => data.cameras,
  useViewCacheValue: () => null,
}));

mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({
    isOwner: access.owner,
    has: () => access.owner,
    can: () => access.create,
    guard: {
      view: true,
      setMode: access.setMode,
      manageGuests: access.manageGuests,
      review: access.review,
      maintenance: access.maintenance,
      answerTamper: true,
    },
    cameraActions: { watch: access.watch, talk: access.talk },
    clips: { view: true },
  }),
}));

mock.module('@/features/cameras', () => ({
  CameraForm: ({ open }: { open: boolean }) => (open ? <span>camera-wizard</span> : null),
  TamperEvidenceView: () => <span>evidence</span>,
  objectLabelKey: () => 'screens.cameras.objects.person',
  cameraViews: () => [],
  cameraMasked: () => false,
  useCameraOverview: () => null,
  useCameraThumbnails: () => new Map([['3', 'data:image/jpeg;base64,AAAA']]),
}));

mock.module('@/features/safety', () => ({
  SosButton: ({ band }: { band?: boolean }) => <button>{band ? 'SOS · mantén' : 'SOS'}</button>,
  askDisarmPin: async () => null,
  safetyService: { disarmNeedsPin: async () => false },
}));

mock.module('@/features/security/hooks/use-maintenance', () => ({
  useMaintenance: () => ({
    windows: data.windows,
    ready: true,
    declare: async () => true,
    end: async (window: MaintenanceWindow) => calls.push(`end:${window.id}`) > 0,
    answerView: async (_window: MaintenanceWindow, cameraId: number, accept: boolean) =>
      calls.push(`view:${cameraId}:${accept}`) > 0,
  }),
  claimTamper: async (id: number) => calls.push(`claim:${id}`) > 0,
}));

mock.module('@/features/security/components/episode-timeline', () => ({
  EpisodeTimeline: ({ episodeId }: { episodeId: number }): ReactNode => (
    <span>{`timeline ${episodeId}`}</span>
  ),
}));
