import { useState } from 'react';
import { View } from 'react-native';
import type { IconName } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import type { CameraAimControls } from '@/features/cameras/hooks/use-camera-aim';
import type { CameraLeaseView } from '@/features/cameras/model/camera-aim';

type CameraSightStatusProps = {
  controls: CameraAimControls;
};

const LEASE_ICONS: Readonly<Record<Exclude<CameraLeaseView, 'free'>, IconName>> = {
  mine: 'hand',
  argus: 'scan-eye',
  other: 'users',
};

export function CameraSightStatus({ controls }: CameraSightStatusProps) {
  const { t } = useTranslation();
  const [pending, setPending] = useState(false);
  const { lease, aim } = controls;

  const giveBack = () => {
    setPending(true);
    void controls.giveBack().finally(() => setPending(false));
  };

  if (lease === 'free' || !aim) return null;
  const label =
    lease === 'mine'
      ? t('screens.cameras.sight.lease-mine')
      : lease === 'argus'
        ? t('screens.cameras.sight.lease-argus')
        : t('screens.cameras.sight.lease-other');

  return (
    <View
      className={cn(
        'flex-row flex-wrap items-center gap-2 rounded-2xl px-3 py-2',
        lease === 'other' ? 'bg-warning/15' : 'bg-surface-secondary',
      )}>
      <Icon
        name={LEASE_ICONS[lease]}
        className={cn('size-4', lease === 'other' ? 'text-warning-strong' : 'text-foreground-secondary')}
      />
      <Text variant="caption" className="text-foreground min-w-0 flex-1">
        {label}
      </Text>
      {lease === 'mine' ? (
        <Button variant="ghost" size="sm" loading={pending} onPress={giveBack}>
          <Text>{t('screens.cameras.sight.give-back')}</Text>
        </Button>
      ) : null}
    </View>
  );
}
