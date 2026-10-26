import { lazyScreen } from '@/shared/libs/lazy-screen';
export const VisitorsScreen = lazyScreen(() => import('./screens/visitors-screen'), 'default');
export const VisitorDetailScreen = lazyScreen(
  () => import('./screens/visitor-detail-screen'),
  'default'
);
export { VisitorsPreviewPanel } from './components/visitors-preview-panel';
