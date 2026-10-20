import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { ProximityReceiver, ProximitySensor } from '@/core/types';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { ListRow } from '@/shared/components/ui/list-row';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { screenIn } from '@/shared/libs/animations';
import { ReceiverDialog } from '@/features/proximity/components/receiver-dialog';
import { SensorDialog } from '@/features/proximity/components/sensor-dialog';
import { useProximityDevices } from '@/features/proximity/hooks/use-proximity-devices';
import { useProximityEnabled } from '@/features/proximity/hooks/use-proximity-me';
import { useProximityPeopleAllowed } from '@/features/proximity/hooks/use-proximity-people';
import { RECEIVER_ICON, SENSOR_ICON, SENSOR_MODEL_LABEL } from '@/features/proximity/model/proximity';

type DeviceTrailingProps = {
  online: boolean;
  label: string;
  onRemove: () => void;
};

function DeviceTrailing({ online, label, onRemove }: DeviceTrailingProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-2">
      <View className={online ? 'bg-success size-2 rounded-full' : 'bg-muted-foreground size-2 rounded-full'} />
      <Text variant="micro">{online ? t('screens.proximity.online') : t('screens.proximity.offline')}</Text>
      <Button variant="ghost" size="icon" accessibilityLabel={label} onPress={onRemove}>
        <Icon name="trash" className="text-muted-foreground size-4" />
      </Button>
    </View>
  );
}

export default function ProximityDevicesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isWide } = useWindowClass();
  const enabled = useProximityEnabled();
  const peopleAllowed = useProximityPeopleAllowed();
  const devices = useProximityDevices(enabled);
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const [receiverOpen, setReceiverOpen] = useState(false);
  const [sensorOpen, setSensorOpen] = useState(false);
  const cameraName = (id: string | null) => cameras.find((camera) => camera.id === id)?.name ?? null;

  const receiverRow = (receiver: ProximityReceiver) => (
    <ListRow
      key={receiver.id}
      icon={RECEIVER_ICON}
      title={receiver.name}
      subtitle={[receiver.room, `${receiver.host}:${receiver.port}`].filter(Boolean).join(' · ')}
      trailing={
        <DeviceTrailing
          online={receiver.online}
          label={t('screens.proximity.receivers.remove-title', { name: receiver.name })}
          onRemove={() => void devices.removeReceiver(receiver)}
        />
      }
    />
  );

  const sensorRow = (sensor: ProximitySensor) => (
    <ListRow
      key={sensor.id}
      icon={SENSOR_ICON}
      title={sensor.name}
      subtitle={[
        sensor.room,
        t(SENSOR_MODEL_LABEL[sensor.model]),
        cameraName(sensor.cameraId) ? t('screens.proximity.sensors.aims', { camera: cameraName(sensor.cameraId) ?? '' }) : null,
      ]
        .filter((part): part is string => Boolean(part))
        .join(' · ')}
      trailing={
        <DeviceTrailing
          online={sensor.online}
          label={t('screens.proximity.sensors.remove-title', { name: sensor.name })}
          onRemove={() => void devices.removeSensor(sensor)}
        />
      }
    />
  );

  const receiversPanel = (
    <Panel
      title={t('screens.proximity.receivers.title')}
      description={t('screens.proximity.receivers.description')}
      count={devices.receivers.length}
      action={
        <Button size="sm" variant="outline" onPress={() => setReceiverOpen(true)}>
          <Text>{t('screens.proximity.receivers.add')}</Text>
        </Button>
      }
      className={isWide ? 'min-w-0 flex-1' : undefined}>
      {devices.receivers.length === 0 ? (
        <Text variant="caption">
          {devices.receiversFailed ? t('screens.proximity.load-failed') : t('screens.proximity.receivers.empty')}
        </Text>
      ) : (
        devices.receivers.map(receiverRow)
      )}
    </Panel>
  );

  const sensorsPanel = (
    <Panel
      title={t('screens.proximity.sensors.title')}
      description={t('screens.proximity.sensors.description')}
      count={devices.sensors.length}
      action={
        <Button size="sm" variant="outline" onPress={() => setSensorOpen(true)}>
          <Text>{t('screens.proximity.sensors.add')}</Text>
        </Button>
      }
      className={isWide ? 'min-w-0 flex-1' : undefined}>
      {devices.sensors.length === 0 ? (
        <Text variant="caption">
          {devices.sensorsFailed ? t('screens.proximity.load-failed') : t('screens.proximity.sensors.empty')}
        </Text>
      ) : (
        devices.sensors.map(sensorRow)
      )}
    </Panel>
  );

  return (
    <>
      <AppScreen
        scrollable={false}
        bottomNav={false}
        header={
          <ScreenHeader
            title={t('screens.proximity.title')}
            subtitle={t('screens.proximity.subtitle')}
            onBack={() => router.back()}
          />
        }>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow pb-8">
          <Animated.View entering={screenIn} className="gap-5">
            <Text variant="caption" className="bg-surface-secondary dark:bg-card-secondary rounded-2xl px-4 py-3">
              {t('screens.proximity.privacy-note')}
            </Text>
            {peopleAllowed ? (
              <Panel>
                <ListRow
                  icon="map-pin"
                  title={t('screens.proximity.people.entry')}
                  subtitle={t('screens.proximity.people.entry-hint')}
                  chevron
                  onPress={() => router.push('/settings/proximity/people')}
                />
              </Panel>
            ) : null}
            <View className={isWide ? 'flex-row items-start gap-5' : 'gap-5'}>
              {receiversPanel}
              {sensorsPanel}
            </View>
          </Animated.View>
        </ScrollView>
      </AppScreen>
      <ReceiverDialog
        open={receiverOpen}
        pending={devices.pending}
        onOpenChange={setReceiverOpen}
        onSubmit={devices.addReceiver}
      />
      <SensorDialog
        open={sensorOpen}
        pending={devices.pending}
        cameras={cameras}
        onOpenChange={setSensorOpen}
        onSubmit={devices.addSensor}
      />
    </>
  );
}
