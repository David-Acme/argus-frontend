import { lazyScreen } from '@/shared/libs/lazy-screen';
export const ProjectsScreen = lazyScreen(() => import('./screens/projects-screen'), 'default');
