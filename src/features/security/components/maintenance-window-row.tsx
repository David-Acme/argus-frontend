import { useState } from 'react';
import { View } from 'react-native';
import type { MaintenanceWindow } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { minutesLeft, pendingChecks } from '@/features/security/model/maintenance';

type MaintenanceWindowRowProps = {
  window: MaintenanceWindow;
  names: readonly string[];
  selfId: number;
  nowSeconds: number;
  onEnd: (window: MaintenanceWindow) => Promise<boolean>;
  onAnswerView: (window: MaintenanceWindow, cameraId: number, accept: boolean) => Promise<boolean>;
};

const END_REASON_KEYS = {
  done: 'done',
  expired: 'expired',
  unknown_person: 'unknown-person',
  replaced: 'replaced',
} as const;

export function MaintenanceWindowRow({ window, names, selfId, nowSeconds, onEnd, onAnswerView }: MaintenanceWindowRowProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const [busy, setBusy] = useState<string | null>(null);
  const checks = pendingChecks(window, selfId);
  const until = date.formatTime(new Date(window.endsAt * 1000));
  const status = window.active
    ? t('screens.security.maintenance.active-until', {
        time: until,
        minutes: String(minutesLeft(window, nowSeconds)),
      })
    : window.endReason
      ? t(`screens.security.maintenance.end-reason.${END_REASON_KEYS[window.endReason]}`)
      : t('screens.security.maintenance.end-reason.done');

  const run = async (key: string, action: () => Promise<boolean>) => {
    setBusy(key);
    await action();
    setBusy(null);
  };

  return (
    <View className="gap-2 rounded-2xl px-1 py-2">
      <View className="flex-row items-start gap-3">
        <View
          className={cn(
            'size-9 items-center justify-center rounded-xl',
            window.active ? 'bg-accent-soft' : 'bg-surface-secondary',
          )}>
          <Icon
            name="wrench"
            className={cn('size-4', window.active ? 'text-accent-strong' : 'text-muted-foreground')}
          />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="label" numberOfLines={2}>
            {names.join(', ')}
          </Text>
          <Text variant="caption">
            {[t('screens.security.maintenance.by', { name: window.declaredByName }), status].join(' · ')}
          </Text>
          {window.duress ? (
            <Text variant="caption" className="text-error-strong font-semibold">
              {t('screens.security.maintenance.duress')}
            </Text>
          ) : null}
        </View>
        {window.active ? (
          <Button
            variant="outline"
            size="sm"
            loading={busy === 'end'}
            onPress={() => void run('end', () => onEnd(window))}>
            <Text>{t('screens.security.maintenance.done')}</Text>
          </Button>
        ) : null}
      </View>
      {checks.map((check) => (
        <View key={check.cameraId} className="bg-warning/15 gap-2 rounded-2xl p-3">
          <Text variant="caption" className="text-foreground">
            {t('screens.security.maintenance.view-question', { name: check.cameraName })}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <Button
              size="sm"
              loading={busy === `yes-${check.cameraId}`}
              onPress={() => void run(`yes-${check.cameraId}`, () => onAnswerView(window, check.cameraId, true))}>
              <Text>{t('screens.security.maintenance.view-yes')}</Text>
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={busy === `no-${check.cameraId}`}
              onPress={() => void run(`no-${check.cameraId}`, () => onAnswerView(window, check.cameraId, false))}>
              <Text>{t('screens.security.maintenance.view-no')}</Text>
            </Button>
          </View>
        </View>
      ))}
    </View>
  );
}
