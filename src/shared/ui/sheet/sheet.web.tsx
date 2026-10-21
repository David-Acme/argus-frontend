import { SheetDialog } from './sheet-dialog';
import type { SheetProps } from './types';

export function Sheet(props: SheetProps) {
  return <SheetDialog {...props} />;
}
