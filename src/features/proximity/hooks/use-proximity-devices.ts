import { useCallback } from 'react';
import type { ProximityReceiver, ProximityReceiverInput, ProximitySensor, ProximitySensorInput } from '@/core/types';
import { proximityService } from '@/features/proximity/services/proximity.service';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';

const loadReceivers = () => proximityService.receivers();
const loadSensors = () => proximityService.sensors();

export function useProximityDevices(enabled: boolean) {
  const { t } = useTranslation();
  const { run, pending } = useServiceAction();
  const receivers = useRemoteResource<ProximityReceiver[]>({
    cacheKey: VIEW_CACHE_KEYS.proximityReceivers,
    load: loadReceivers,
    enabled,
  });
  const sensors = useRemoteResource<ProximitySensor[]>({
    cacheKey: VIEW_CACHE_KEYS.proximitySensors,
    load: loadSensors,
    enabled,
  });
  const reloadReceivers = receivers.reload;
  const reloadSensors = sensors.reload;

  const addReceiver = useCallback(
    async (input: ProximityReceiverInput): Promise<boolean> => {
      const result = await run({
        call: () => proximityService.addReceiver(input),
        success: t('screens.proximity.receivers.added'),
        errorTitle: t('screens.proximity.receivers.add-failed'),
      });
      if (result) void reloadReceivers();
      return result !== null;
    },
    [reloadReceivers, run, t]
  );

  const removeReceiver = useCallback(
    async (receiver: ProximityReceiver) => {
      const result = await run({
        confirm: {
          title: t('screens.proximity.receivers.remove-title', { name: receiver.name }),
          description: t('screens.proximity.receivers.remove-description'),
          confirmLabel: t('common.confirm-delete'),
          intent: 'danger',
        },
        call: () => proximityService.removeReceiver(receiver.id),
        errorTitle: t('screens.proximity.receivers.remove-failed'),
      });
      if (result) void reloadReceivers();
    },
    [reloadReceivers, run, t]
  );

  const addSensor = useCallback(
    async (input: ProximitySensorInput): Promise<boolean> => {
      const result = await run({
        call: () => proximityService.addSensor(input),
        success: t('screens.proximity.sensors.added'),
        errorTitle: t('screens.proximity.sensors.add-failed'),
      });
      if (result) void reloadSensors();
      return result !== null;
    },
    [reloadSensors, run, t]
  );

  const removeSensor = useCallback(
    async (sensor: ProximitySensor) => {
      const result = await run({
        confirm: {
          title: t('screens.proximity.sensors.remove-title', { name: sensor.name }),
          description: t('screens.proximity.sensors.remove-description'),
          confirmLabel: t('common.confirm-delete'),
          intent: 'danger',
        },
        call: () => proximityService.removeSensor(sensor.id),
        errorTitle: t('screens.proximity.sensors.remove-failed'),
      });
      if (result) void reloadSensors();
    },
    [reloadSensors, run, t]
  );

  return {
    receivers: receivers.data ?? [],
    sensors: sensors.data ?? [],
    receiversFailed: receivers.status === 'failed',
    sensorsFailed: sensors.status === 'failed',
    addReceiver,
    removeReceiver,
    addSensor,
    removeSensor,
    pending,
  };
}
