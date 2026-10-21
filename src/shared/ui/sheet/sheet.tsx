import { useWindowLayout } from '@/shared/theme/use-window-layout';
import { SheetDialog } from './sheet-dialog';
import { SheetPhone } from './sheet-phone';
import type { SheetProps } from './types';

export function Sheet(props: SheetProps) {
  const { navigation } = useWindowLayout();
  return navigation === 'bar' ? <SheetPhone {...props} /> : <SheetDialog {...props} />;
}
