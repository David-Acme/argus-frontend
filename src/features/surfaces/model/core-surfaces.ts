import { ASSISTANT_THREAD_HREF, CAPABILITY, MODULE_IDS } from '@/shared/constants';
import { peopleAccessOf } from '@/shared/libs/capabilities';
import { routeFallback } from '@/shared/libs/route-access';
import type { ModuleSurfaces } from '@/shared/libs/surfaces';
import {
  AttentionSection,
  HelpSection,
  ModuleCards,
  NewsSection,
  SystemSection,
} from '@/features/home';

export const CORE_SURFACES: ModuleSurfaces = {
  module: MODULE_IDS.core,
  order: 0,
  destinations: [
    {
      id: 'home',
      href: '/',
      icon: 'home',
      label: 'screens.navigation.home',
      order: 0,
      jump: 'screens.command.section-home',
      needs: { route: '/' },
      segments: ['notification'],
    },
    {
      id: 'argus',
      href: ASSISTANT_THREAD_HREF,
      icon: 'cmd',
      label: 'screens.navigation.argus',
      order: 10,
      jump: 'screens.command.section-argus',
      argus: true,
      needs: { route: ASSISTANT_THREAD_HREF, capabilities: [CAPABILITY.assistantVoice] },
      segments: ['conversations'],
    },
    {
      id: 'news',
      href: '/notification',
      icon: 'bell',
      label: 'screens.navigation.dest.news',
      order: 20,
      needs: { route: '/notification', capabilities: [CAPABILITY.notificationsRead] },
    },
    {
      id: 'you',
      href: '/profile',
      icon: 'user',
      label: 'screens.navigation.you',
      order: 90,
      jump: 'screens.command.section-you',
      needs: { route: '/profile' },
      segments: ['profile', 'people', 'users'],
    },
    {
      id: 'settings',
      href: '/settings',
      icon: 'sliders',
      label: 'screens.navigation.settings',
      order: 95,
      needs: { route: '/settings' },
      segments: ['settings'],
    },
  ],
  inicio: [
    {
      id: 'attention',
      label: 'screens.home.inicio.sections.attention',
      render: AttentionSection,
      places: {
        stack: { order: 5 },
        first: { order: 5 },
        band: { order: 5, column: 'agenda' },
        wide: { order: 5, column: 'agenda' },
      },
    },
    {
      id: 'modules',
      label: 'screens.home.inicio.sections.modules',
      render: ModuleCards,
      places: {
        stack: { order: 60 },
        band: { order: 60, column: 'side' },
        wide: { order: 60, column: 'side' },
      },
    },
    {
      id: 'news',
      label: 'screens.home.inicio.sections.news',
      render: NewsSection,
      places: {
        stack: { order: 50, when: 'news' },
        first: { order: 10, when: 'news' },
        band: { order: 10, column: 'news', when: 'news' },
        wide: { order: 10, column: 'news', when: 'news' },
      },
    },
    {
      id: 'system',
      label: 'screens.home.inicio.sections.system',
      render: SystemSection,
      needs: { anyOf: [CAPABILITY.modulesRead, CAPABILITY.cameraView] },
      places: {
        first: { order: 20 },
        band: { order: 70, column: 'side', when: 'sparse' },
        wide: { order: 70, column: 'side' },
      },
    },
    {
      id: 'help',
      label: 'screens.home.inicio.sections.help',
      render: HelpSection,
      places: {
        first: { order: 30, when: 'tablet' },
        band: { order: 80, column: 'side', when: 'sparse' },
        wide: { order: 80, column: 'side', when: 'sparse' },
      },
    },
  ],
  search: [
    {
      id: 'person',
      needs: {
        allows: (view) =>
          peopleAccessOf(view).receivesDirectory &&
          ['/users', '/people'].some((route) => routeFallback(route, view) === null),
      },
    },
  ],
  actions: [
    {
      id: 'reminder',
      needs: {
        route: ASSISTANT_THREAD_HREF,
        capabilities: [CAPABILITY.remindersWrite],
      },
    },
  ],
};
