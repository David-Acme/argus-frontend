import { CAPABILITY, MODULE_IDS } from '@/shared/constants';
import { clipAccessOf, guardAccessOf, tableAllowed } from '@/shared/libs/capabilities';
import type { ModuleSurfaces } from '@/shared/libs/surfaces';
import { RecentClipsCard } from '@/features/cameras';
import { CamerasSection, HappenedSection, HomePeopleSection, WatchSection } from '@/features/home';

export const SURVEILLANCE_SURFACES: ModuleSurfaces = {
  module: MODULE_IDS.surveillance,
  order: 10,
  hub: {
    label: 'screens.navigation.security',
    icon: 'shield',
    href: '/security',
    needs: { route: '/security' },
  },
  destinations: [
    {
      id: 'security',
      href: '/security',
      icon: 'shield',
      label: 'screens.navigation.security',
      order: 30,
      jump: 'screens.command.section-security',
      needs: { route: '/security' },
      segments: ['security'],
    },
    {
      id: 'cameras',
      href: '/cameras',
      icon: 'cam',
      label: 'screens.navigation.dest.cameras',
      order: 31,
      needs: { route: '/cameras' },
      segments: ['cameras'],
    },
    {
      id: 'clips',
      href: '/clips',
      icon: 'play',
      label: 'screens.navigation.dest.clips',
      order: 32,
      jump: 'screens.navigation.dest.clips',
      needs: { route: '/clips' },
      segments: ['clips'],
    },
    {
      id: 'episodes',
      href: '/security/episodes',
      icon: 'hist',
      label: 'screens.navigation.dest.episodes',
      order: 33,
      needs: { route: '/security', allows: (view) => guardAccessOf(view).view },
    },
    {
      id: 'watch',
      href: '/watch',
      icon: 'ear',
      label: 'screens.navigation.dest.watch',
      order: 34,
      needs: { route: '/watch' },
      segments: ['watch'],
    },
  ],
  inicio: [
    {
      id: 'watch',
      render: WatchSection,
      needs: { allows: (view) => guardAccessOf(view).view },
      places: {
        stack: { order: 10, when: 'watch' },
        band: { order: 10, column: 'agenda', when: 'watch' },
        wide: { order: 10, column: 'agenda', when: 'watch' },
      },
    },
    {
      id: 'cameras',
      render: CamerasSection,
      needs: { capabilities: [CAPABILITY.cameraView] },
      places: {
        stack: { order: 30, when: 'tiles' },
        band: { order: 10, column: 'side', when: 'tiles', grows: true },
        wide: { order: 10, column: 'cameras', when: 'tiles', grows: true },
      },
    },
    {
      id: 'clips',
      render: RecentClipsCard,
      needs: {
        route: '/clips',
        allows: (view) => clipAccessOf(view).view,
      },
      places: {
        stack: { order: 40 },
        band: { order: 30, column: 'side' },
        wide: { order: 40, column: 'side' },
      },
    },
    {
      id: 'happened',
      render: HappenedSection,
      needs: { capabilities: [CAPABILITY.cameraView] },
      places: { wide: { order: 20, column: 'cameras' } },
    },
    {
      id: 'people',
      render: HomePeopleSection,
      needs: { capabilities: [CAPABILITY.presenceRead] },
      places: {
        band: { order: 20, column: 'side' },
        wide: { order: 10, column: 'side' },
      },
    },
  ],
  search: [
    {
      id: 'camera',
      needs: { route: '/cameras', allows: (view) => tableAllowed(view, 'camera', 'read') },
    },
  ],
};
