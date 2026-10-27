import { CAPABILITY, MODULE_IDS } from '@/shared/constants';
import { tableAllowed } from '@/shared/libs/capabilities';
import type { ModuleSurfaces } from '@/shared/libs/surfaces';
import { NowSection, ProjectsSection, TodaySection, TomorrowSection } from '@/features/home';

const AGENDA = { capabilities: [CAPABILITY.agendaRead] } as const;

export const PRODUCTIVITY_SURFACES: ModuleSurfaces = {
  module: MODULE_IDS.productivity,
  order: 20,
  hub: {
    label: 'screens.navigation.agenda',
    icon: 'cal',
    href: '/agenda',
    needs: { route: '/agenda' },
  },
  destinations: [
    {
      id: 'agenda',
      href: '/agenda',
      icon: 'cal',
      label: 'screens.navigation.dest.calendar',
      order: 40,
      jump: 'screens.command.section-agenda',
      needs: { route: '/agenda' },
      segments: ['agenda'],
    },
    {
      id: 'projects',
      href: '/projects',
      icon: 'grid',
      label: 'screens.navigation.dest.projects',
      order: 41,
      needs: { route: '/projects' },
      segments: ['projects'],
    },
  ],
  inicio: [
    {
      id: 'now',
      render: NowSection,
      needs: AGENDA,
      places: {
        stack: { order: 20, when: 'day' },
        band: { order: 20, column: 'agenda' },
        wide: { order: 20, column: 'agenda' },
      },
    },
    {
      id: 'today',
      render: TodaySection,
      needs: AGENDA,
      places: {
        first: { order: 40, when: 'tablet' },
        band: { order: 21, column: 'agenda' },
        wide: { order: 21, column: 'agenda' },
      },
    },
    {
      id: 'tomorrow',
      render: TomorrowSection,
      needs: AGENDA,
      places: {
        stack: { order: 21, when: 'night' },
        band: { order: 22, column: 'agenda' },
        wide: { order: 22, column: 'agenda' },
      },
    },
    {
      id: 'projects',
      render: ProjectsSection,
      needs: AGENDA,
      places: { wide: { order: 20, column: 'side' } },
    },
  ],
  search: [
    {
      id: 'event',
      needs: { route: '/agenda', allows: (view) => tableAllowed(view, 'calendar_event', 'read') },
    },
    {
      id: 'task',
      needs: { route: '/projects', allows: (view) => tableAllowed(view, 'project_task', 'read') },
    },
    {
      id: 'project',
      needs: { route: '/projects', allows: (view) => tableAllowed(view, 'project', 'read') },
    },
  ],
  actions: [
    {
      id: 'event',
      needs: { route: '/agenda', allows: (view) => tableAllowed(view, 'calendar_event', 'create') },
    },
    {
      id: 'task',
      needs: { route: '/projects', allows: (view) => tableAllowed(view, 'project_task', 'create') },
    },
    {
      id: 'project',
      needs: { route: '/projects', allows: (view) => tableAllowed(view, 'project', 'create') },
    },
  ],
};
