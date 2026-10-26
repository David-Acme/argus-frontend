import { lazyScreen } from '@/shared/libs/lazy-screen';
export { QrManualEntry } from './components/qr-manual-entry';
export const QrScanScreen = lazyScreen(() => import('./screens/qr-scan-screen'), 'default');
