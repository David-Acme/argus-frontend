import { useState, type ReactNode } from 'react';
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
import { submitsDialog } from '@/shared/components/ui/dialog-submit-key';
import { OverlayBody } from '@/shared/components/ui/overlay-body';
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from '@/shared/components/ui/sheet';
import { DIALOG_INSET, IS_WEB, SHEET_INSET } from '@/shared/constants';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

type AdaptiveDialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  closeLabel: string;
  children?: ReactNode;
  footer?: ReactNode;
  dismissible?: boolean;
  contentClassName?: string;
  onSubmit?: () => void;
};

type SubmitKeyEvent = Parameters<typeof submitsDialog>[0] & {
  nativeEvent?: { isComposing?: boolean };
  preventDefault: () => void;
};

const DIALOG_WIDTH_CLASS = {
  compact: 'sm:max-w-[520px]',
  medium: 'sm:max-w-[560px]',
  expanded: 'sm:max-w-[620px]',
} as const;

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
  onSubmit,
}: AdaptiveDialogProps) {
  const { isCompact, windowClass } = useWindowClass();
  const [overflowing, setOverflowing] = useState(false);
  const submitKeys = IS_WEB && onSubmit != null;

  const onKeyDownCapture = (event: SubmitKeyEvent) => {
    if (!onSubmit) return;
    if (!submitsDialog({ ...event, isComposing: event.nativeEvent?.isComposing })) return;
    event.preventDefault();
    onSubmit();
  };

  if (isCompact) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
        <SheetContent
          className={contentClassName}
          dismissible={dismissible}
          {...(submitKeys ? { onKeyDownCapture } : null)}>
          <SheetHeader
            title={title}
            description={description}
            closeLabel={closeLabel}
            dismissible={dismissible}
          />
          {children ? (
            <OverlayBody inset={SHEET_INSET} className="-my-1.5">
              {children}
            </OverlayBody>
          ) : null}
          {footer ? <View className="flex-row justify-end gap-2 pt-1">{footer}</View> : null}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={cn('gap-0', DIALOG_WIDTH_CLASS[windowClass], contentClassName)}
        dismissible={dismissible}
        closeLabel={closeLabel}
        {...(submitKeys ? { onKeyDownCapture } : null)}>
        <DialogHeader
          className={cn(
            '-mx-6 px-6 pr-14',
            children ? 'pb-2.5' : 'pb-4',
            overflowing && 'border-border-subtle border-b pb-4'
          )}>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children ? (
          <OverlayBody inset={DIALOG_INSET} onOverflowChange={setOverflowing}>
            {children}
          </OverlayBody>
        ) : null}
        {footer ? (
          <DialogFooter
            className={cn(
              '-mx-6 px-6',
              children ? 'pt-2.5' : null,
              overflowing && 'border-border-subtle border-t pt-4'
            )}>
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
