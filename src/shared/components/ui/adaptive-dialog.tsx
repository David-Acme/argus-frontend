import { type ReactNode } from 'react';
import { View } from 'react-native';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from '@/shared/components/ui/sheet';
import { useWindowClass } from '@/shared/hooks/use-window-class';

type AdaptiveDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  /** Accessible label of the close affordance on the sheet variant. */
  closeLabel: string;
  children?: ReactNode;
  /** Actions row. Pinned under the body on both shapes. */
  footer?: ReactNode;
  contentClassName?: string;
};

/**
 * One modal API, the right shape per form factor: a centered dialog where
 * there is room for one, a bottom sheet on phones — where a centered dialog
 * always feels like a web page. The switch is the window class, not the
 * platform, so a phone in landscape and a small desktop window agree.
 */
export function AdaptiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  closeLabel,
  children,
  footer,
  contentClassName,
}: AdaptiveDialogProps) {
  const { isCompact } = useWindowClass();

  if (isCompact) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
        <SheetContent className={contentClassName}>
          <SheetHeader title={title} description={description} closeLabel={closeLabel} />
          {children}
          {footer ? <View className="flex-row justify-end gap-2 pt-1">{footer}</View> : null}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={contentClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
