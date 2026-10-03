import { type ReactNode } from 'react';
import { View } from 'react-native';
import type { IconName } from '@/core/types';
import { cn } from '@/shared/libs/utils';
import { EmptyStateContent } from './empty-state';

type SectionPanelProps = {
  children?: ReactNode;
  isEmpty: boolean;
  icon: IconName;
  emptyTitle: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  minHeight?: number;
  fill?: boolean;
  className?: string;
};

export function SectionPanel({
  children,
  isEmpty,
  icon,
  emptyTitle,
  emptyHint,
  emptyAction,
  minHeight,
  fill = false,
  className,
}: SectionPanelProps) {
  return (
    <View
      className={cn(
        'border-border-subtle bg-card/40 rounded-3xl border border-dashed p-3',
        fill && 'flex-1',
        isEmpty && 'items-center justify-center px-6 py-8',
        className
      )}
      style={minHeight ? { minHeight } : undefined}>
      {isEmpty ? (
        <EmptyStateContent
          icon={icon}
          title={emptyTitle}
          hint={emptyHint}
          action={emptyAction}
        />
      ) : (
        children
      )}
    </View>
  );
}
