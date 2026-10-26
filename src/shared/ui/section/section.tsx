import { clsx } from 'clsx';
import { Children, type ReactNode } from 'react';
import { View } from 'react-native';
import { size, useThemeTokens } from '@/shared/theme';
import { PressableSurface } from '@/shared/ui/pressable';
import { RowPosition } from '@/shared/ui/row';
import { useInScreenColumn } from '@/shared/ui/screen';
import { Text } from '@/shared/ui/text';

export type SectionAction = { label: string; onPress: () => void };

export type SectionProps = {
  title?: string;
  meta?: string;
  action?: SectionAction;
  variant?: 'grouped' | 'plain';
  testID?: string;
  children: ReactNode;
};

type SectionHeadProps = Pick<SectionProps, 'title' | 'meta' | 'action'>;

type GroupProps = { children: ReactNode };

const LINK_SLOP = (size.target - size.targetMin) / 2;

function SectionHead({ title, meta, action }: SectionHeadProps) {
  const sticky = useInScreenColumn();
  if (!title && !meta && !action) return null;
  return (
    <View
      className={clsx(
        'gap-section-head-gap px-section-head-x pb-section-head-bottom flex-row items-baseline justify-between',
        sticky && 'web:sticky web:top-0 web:z-10 web:fade-to-bg web:pt-screen-head-top'
      )}>
      {title ? (
        <Text variant="section" heading={2}>
          {title}
        </Text>
      ) : (
        <View />
      )}
      {action ? (
        <PressableSurface
          a11y={{ label: action.label, role: 'link' }}
          onPress={action.onPress}
          hitSlop={LINK_SLOP}
          className="py-section-link-y">
          <Text variant="sectionLink" tone="2">
            {action.label}
          </Text>
        </PressableSurface>
      ) : null}
      {!action && meta ? <Text variant="sectionMeta">{meta}</Text> : null}
    </View>
  );
}

function Group({ children }: GroupProps) {
  const { elevation } = useThemeTokens();
  const column = useInScreenColumn();
  const card = { boxShadow: elevation.card };
  return (
    <View
      className={clsx(
        'rounded-card bg-surface py-section-group-y web:focus-inset overflow-hidden',
        column && 'grow'
      )}
      style={card}>
      {Children.toArray(children).map((child, index) => (
        <RowPosition.Provider key={index} value={{ index }}>
          {child}
        </RowPosition.Provider>
      ))}
    </View>
  );
}

export function Section({
  title,
  meta,
  action,
  variant = 'grouped',
  testID,
  children,
}: SectionProps) {
  const column = useInScreenColumn();
  return (
    <View className={clsx('mt-section-top', column && 'grow')} testID={testID}>
      <SectionHead title={title} meta={meta} action={action} />
      {variant === 'grouped' ? <Group>{children}</Group> : children}
    </View>
  );
}
