import { type ReactNode } from 'react';
import { View } from 'react-native';
import type { IconName } from '@/core/types';
import { cn } from '@/shared/libs/utils';
import { EmptyStateContent } from './empty-state';

type SectionPanelProps = {
  /** Rows to show; when there are none the panel explains itself instead. */
  children?: ReactNode;
  isEmpty: boolean;
  icon: IconName;
  emptyTitle: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
  /** Keeps the section the same size whether it holds nothing or three rows. */
  minHeight?: number;
  /** Fills the paired column on a wide dashboard so both panels share its height. */
  fill?: boolean;
  className?: string;
};

/**
 * The frame of a dashboard section. The panel is always there — with rows
 * inside it once there are any — so the layout does not change shape when the
 * first record arrives, and an empty section still reads as a place where
 * something belongs.
 */
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
