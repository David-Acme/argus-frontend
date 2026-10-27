import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useThemeTokens } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import type { IconGlyph, IconTone } from '@/shared/ui/icon';
import { Text } from '@/shared/ui/text';
import type { ResultSurface } from '@/features/voice/hooks/use-result-actions';

export type ResultShellProps = {
  surface: ResultSurface;
  label: string;
  children: ReactNode;
};

export type ResultHeadProps = {
  icon: IconGlyph;
  tone?: 'accent' | 'ok' | 'alert';
  title: string;
  meta?: string;
};

export type ResultActionsRowProps = { children: ReactNode };

const WELL: Record<NonNullable<ResultHeadProps['tone']>, { fill: string; icon: IconTone }> = {
  accent: { fill: 'bg-fill', icon: 'accent' },
  ok: { fill: 'bg-ok-soft', icon: 'ok' },
  alert: { fill: 'bg-alert-soft', icon: 'alert' },
};

export function ResultShell({ surface, label, children }: ResultShellProps) {
  const { elevation } = useThemeTokens();
  const card = surface === 'chat' ? { boxShadow: elevation.card } : undefined;
  return (
    <View
      role="group"
      aria-label={label}
      accessibilityLiveRegion="polite"
      style={card}
      className={clsx(
        'rounded-media bg-surface w-full overflow-hidden',
        surface === 'call' && 'border-line border'
      )}>
      {children}
    </View>
  );
}

export function ResultHead({ icon, tone = 'accent', title, meta }: ResultHeadProps) {
  const well = WELL[tone];
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View className={clsx('size-well rounded-well items-center justify-center', well.fill)}>
        <Icon name={icon} size="small" tone={well.icon} />
      </View>
      <View className="min-w-0 flex-1">
        <Text variant="label" numberOfLines={2}>
          {title}
        </Text>
        {meta ? (
          <Text variant="rowMeta" tone="2" numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function ResultActionsRow({ children }: ResultActionsRowProps) {
  return <View className="flex-row flex-wrap gap-2 px-4 pb-3">{children}</View>;
}
