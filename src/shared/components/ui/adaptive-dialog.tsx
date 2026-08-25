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
import { cn } from '@/shared/libs/utils';

/**
 * A dialog grows with the window: the same form that fills a phone sheet looks
 * pinched in a 512px box on a tablet, and paired fields need the room.
 */
const DIALOG_WIDTH_CLASS = {
  compact: 'sm:max-w-[520px]',
  medium: 'sm:max-w-[560px]',
  expanded: 'sm:max-w-[620px]',
} as const;

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
  /** Disables every dismissal path while it stays visible. */
  dismissible?: boolean;
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
  dismissible = true,
  contentClassName,
}: AdaptiveDialogProps) {
  const { isCompact, windowClass } = useWindowClass();

  if (isCompact) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
        <SheetContent className={contentClassName} dismissible={dismissible}>
          <SheetHeader
            title={title}
            description={description}
            closeLabel={closeLabel}
            dismissible={dismissible}
          />
          {children}
          {footer ? <View className="flex-row justify-end gap-2 pt-1">{footer}</View> : null}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={cn(DIALOG_WIDTH_CLASS[windowClass], contentClassName)}
        dismissible={dismissible}>
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
