import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Icon } from '@/shared/components/ui/icon';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type IconPickerButtonProps = {
  options: readonly IconName[];
  value: string;
  onChange: (icon: IconName) => void;
};

/** The icon lives behind one square button, so the form stays one line wide. */
export function IconPickerButton({ options, value, onChange }: IconPickerButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('screens.cameras.icon')}
        onPress={() => setOpen(true)}
        className="border-border bg-card size-11 items-center justify-center rounded-md border active:opacity-70">
        <Icon name={(value || 'video') as IconName} className="text-foreground size-5" />
      </Pressable>

      <AdaptiveDialog
        open={open}
        onOpenChange={setOpen}
        title={t('screens.cameras.icon')}
        closeLabel={t('common.close')}>
        <View className="flex-row flex-wrap gap-2.5 pb-1">
          {options.map((option) => {
            const selected = option === value;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={option}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={cn(
                  'size-14 items-center justify-center rounded-2xl border active:opacity-70',
                  selected ? 'border-interactive bg-surface-secondary' : 'border-border-subtle'
                )}>
                <Icon
                  name={option}
                  className={cn('size-6', selected ? 'text-foreground' : 'text-muted-foreground')}
                />
              </Pressable>
            );
          })}
        </View>
      </AdaptiveDialog>
    </>
  );
}
