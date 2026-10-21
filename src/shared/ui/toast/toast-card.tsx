import { View } from 'react-native';
import { size, useThemeTokens } from '@/shared/theme';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';

export type ToastKind = 'info' | 'success' | 'error' | 'undo';

export type ToastCardProps = {
  kind: ToastKind;
  title: string;
  body?: string;
  icon?: IconGlyph;
  onAction?: () => void;
};

type ActionProps = { label: string; onPress: () => void };

const LEADING: Partial<Record<ToastKind, IconGlyph>> = { success: 'check' };

const FILL_SLOP = (size.target - size.buttonCompact) / 2;

function InkAction({ label, onPress }: ActionProps) {
  return (
    <PressableSurface
      a11y={{ label, role: 'button' }}
      onPress={onPress}
      pressed={{ scale: 'surface' }}
      className="min-h-target-min rounded-toast-action px-toast-action-x justify-center">
      <Text variant="toastAction" tone="on-ink" underline>
        {label}
      </Text>
    </PressableSurface>
  );
}

function FillAction({ label, onPress }: ActionProps) {
  return (
    <PressableSurface
      a11y={{ label, role: 'button' }}
      onPress={onPress}
      pressed={{ scale: 'surface' }}
      hitSlop={FILL_SLOP}
      className="min-h-button-compact rounded-toast-action px-toast-action-x bg-fill -mt-0.5 justify-center">
      <Text variant="toastAction">{label}</Text>
    </PressableSurface>
  );
}

function ErrorCard({ title, body, icon = 'alert', onAction }: Omit<ToastCardProps, 'kind'>) {
  const { t } = useTranslation();
  const { elevation } = useThemeTokens();
  const shadow = { boxShadow: `${elevation.float}, ${elevation.ringInset}` };
  return (
    <View
      role="status"
      accessibilityLiveRegion="polite"
      style={shadow}
      className="rounded-toast bg-surface pt-toast-error-top pr-toast-error-end pb-toast-error-bottom pl-toast-error-start gap-2">
      <View className="flex-row items-start gap-2">
        <View className="mt-px">
          <Icon name={icon} size="small" tone="alert" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="toastTitle">{title}</Text>
          {body ? (
            <Text variant="toastBody" tone="2">
              {body}
            </Text>
          ) : null}
        </View>
      </View>
      {onAction ? (
        <View className="flex-row justify-end">
          <FillAction label={t('common.retry')} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

function InkCard({ kind, title, onAction }: Pick<ToastCardProps, 'kind' | 'title' | 'onAction'>) {
  const { t } = useTranslation();
  const { elevation } = useThemeTokens();
  const shadow = { boxShadow: elevation.float };
  const leading = LEADING[kind];
  return (
    <View
      role="status"
      accessibilityLiveRegion="polite"
      style={shadow}
      className="rounded-toast bg-ink py-toast-y pr-toast-end pl-toast-start min-h-target-min flex-row items-center gap-2">
      {leading ? <Icon name={leading} size="small" tone="on-ink" /> : null}
      <View className="min-w-0 flex-1">
        <Text variant="feed" tone="on-ink">
          {title}
        </Text>
      </View>
      {kind === 'undo' && onAction ? (
        <InkAction label={t('common.undo')} onPress={onAction} />
      ) : null}
    </View>
  );
}

export function ToastCard({ kind, title, body, icon, onAction }: ToastCardProps) {
  if (kind === 'error')
    return <ErrorCard title={title} body={body} icon={icon} onAction={onAction} />;
  return <InkCard kind={kind} title={title} onAction={onAction} />;
}
