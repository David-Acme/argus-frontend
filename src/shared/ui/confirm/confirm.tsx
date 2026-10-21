import { ConfirmDialog } from './confirm-dialog';
import type { ConfirmProps } from './confirm-types';

export function Confirm(props: ConfirmProps) {
  return <ConfirmDialog {...props} />;
}
