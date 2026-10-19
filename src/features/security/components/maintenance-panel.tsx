import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { MaintenanceDialog } from '@/features/security/components/maintenance-dialog';
import { MaintenanceWindowRow } from '@/features/security/components/maintenance-window-row';
import { useGuardEnvironments } from '@/features/security/hooks/use-guard';
import { useMaintenance } from '@/features/security/hooks/use-maintenance';
import { cameraNames, windowsForCamera } from '@/features/security/model/maintenance';

const MAINTENANCE_CLOCK_MS = 30_000;

type MaintenancePanelProps = {
  cameraId?: string;
  className?: string;
};

export function MaintenancePanel({ cameraId, className }: MaintenancePanelProps) {
  const { t } = useTranslation();
  const { guard } = useCapabilities();
  const selfId = useAuthStore((state) => Number(state.user?.id ?? 0));
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const environments = useGuardEnvironments(guard.maintenance).data ?? [];
  const maintenance = useMaintenance(guard.maintenance);
  const [open, setOpen] = useState(false);
  const [nowSeconds, setNowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const target = cameraId === undefined ? undefined : Number(cameraId);
  const names = useMemo(
    () => new Map(cameras.map((camera) => [Number(camera.id), camera.name] as const)),
    [cameras],
  );
  const windows = target === undefined ? maintenance.windows : windowsForCamera(maintenance.windows, target);

  useEffect(() => {
    const timer = setInterval(() => setNowSeconds(Math.floor(Date.now() / 1000)), MAINTENANCE_CLOCK_MS);
    return () => clearInterval(timer);
  }, []);

  if (!guard.maintenance) return null;

  return (
    <>
      <Panel
        title={t('screens.security.maintenance.title')}
        description={t('screens.security.maintenance.description')}
        count={windows.filter((window) => window.active).length || undefined}
        className={className}
        action={
          <Button variant="ghost" size="sm" onPress={() => setOpen(true)}>
            <Icon name="wrench" className="text-foreground size-4" />
            <Text>{t('screens.security.maintenance.declare-short')}</Text>
          </Button>
        }>
        {windows.length === 0 ? (
          <Text variant="caption">{t('screens.security.maintenance.empty')}</Text>
        ) : (
          <View className="gap-1">
            {windows.map((window) => (
              <MaintenanceWindowRow
                key={window.id}
                window={window}
                names={cameraNames(window, names)}
                selfId={selfId}
                nowSeconds={nowSeconds}
                onEnd={maintenance.end}
                onAnswerView={maintenance.answerView}
              />
            ))}
          </View>
        )}
      </Panel>
      {open ? (
        <MaintenanceDialog
          open
          onOpenChange={setOpen}
          cameras={cameras}
          environments={environments}
          cameraId={target}
          onSubmit={maintenance.declare}
        />
      ) : null}
    </>
  );
}
