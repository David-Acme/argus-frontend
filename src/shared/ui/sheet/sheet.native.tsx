import { useWindowClass } from '@/shared/hooks/use-window-class';
import { SheetDialog } from './sheet-dialog';
import { SheetPhone } from './sheet-phone';
import type { SheetProps } from './types';

export function Sheet(props: SheetProps) {
  const { isCompact } = useWindowClass();
  return isCompact ? <SheetPhone {...props} /> : <SheetDialog {...props} />;
}
