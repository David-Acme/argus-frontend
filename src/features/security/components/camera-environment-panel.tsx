import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useTranslation } from '@/shared/hooks/use-translation';
import { guardAccessForRole } from '@/shared/libs/role-access';
import { cn } from '@/shared/libs/utils';
import { CameraContextEditor } from '@/features/security/components/camera-context-editor';
import {
  CAMERA_ROLE_ICONS,
  CAMERA_ROLE_KEYS,
  ENVIRONMENT_KIND_ICONS,
  GUARD_MODE_ICONS,
} from '@/features/security/constants';
import { useCameraPlacement } from '@/features/security/hooks/use-guard';
import { environmentForCamera, postureKey } from '@/features/security/model/environments';

type CameraEnvironmentPanelProps = {
  cameraId: string;
  className?: string;
};

export function CameraEnvironmentPanel({ cameraId, className }: CameraEnvironmentPanelProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role) ?? 'guest';
  const access = guardAccessForRole(role);
  const owner = access.review;
  const placement = useCameraPlacement(owner, access.view);
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const [editing, setEditing] = useState(false);
  const environments = placement.environments.data ?? [];
  const environment = environmentForCamera(environments, cameraId);
  const context = placement.contexts.find((row) => String(row.cameraId) === cameraId) ?? null;
  const camera = cameras.find((row) => row.id === cameraId);

  if (!access.view) return null;

  const details = context
    ? [
        t(`screens.security.cameras.roles.${CAMERA_ROLE_KEYS[context.role]}`),
        context.outdoor ? t('screens.security.cameras.summary.outdoor') : t('screens.security.cameras.summary.indoor'),
        context.publicArea ? t('screens.security.cameras.summary.public') : null,
      ]
        .filter((part): part is string => part !== null)
        .join(' · ')
    : t('screens.security.camera-panel.not-described');

  return (
    <Panel
      title={t('screens.security.camera-panel.title')}
      description={t('screens.security.camera-panel.description')}
      className={className}
      action={
        owner && environment ? (
          <Button variant="ghost" size="sm" onPress={() => setEditing(true)}>
            <Icon name="pencil" />
            <Text>{t('screens.security.camera-panel.edit')}</Text>
          </Button>
        ) : undefined
      }>
      {environment ? (
        <View className="gap-3">
          <View className="flex-row items-center gap-3">
            <View className="bg-surface-secondary size-10 items-center justify-center rounded-2xl">
              <Icon name={ENVIRONMENT_KIND_ICONS[environment.kind]} className="text-foreground size-5" />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text variant="body" numberOfLines={1} className="font-medium">
                {environment.name}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {t(`screens.security.occupancy.${postureKey(environment)}`)}
              </Text>
            </View>
            <View className="bg-surface-secondary flex-row items-center gap-1.5 rounded-full px-2.5 py-1">
              <Icon name={GUARD_MODE_ICONS[environment.effectiveMode]} className="text-foreground-secondary size-3.5" />
              <Text variant="micro" className="text-foreground-secondary font-semibold">
                {t(`screens.security.mode.${environment.effectiveMode}`)}
              </Text>
            </View>
          </View>
          {owner ? (
            <View className="flex-row items-center gap-3">
              <View
                className={cn(
                  'size-10 items-center justify-center rounded-2xl',
                  context ? 'bg-accent/15' : 'bg-surface-secondary'
                )}>
                <Icon
                  name={context ? CAMERA_ROLE_ICONS[context.role] : 'camera'}
                  className={cn('size-5', context ? 'text-accent-strong' : 'text-muted-foreground')}
                />
              </View>
              <Text variant="caption" className="min-w-0 flex-1">
                {details}
              </Text>
            </View>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onPress={() => router.push(`/security/${environment.id}`)}>
            <Icon name="map-pin" />
            <Text>{t('screens.security.camera-panel.open-environment')}</Text>
          </Button>
        </View>
      ) : (
        <View className="bg-surface-secondary h-24 rounded-2xl" />
      )}
      {editing && environment ? (
        <CameraContextEditor
          open
          onOpenChange={setEditing}
          cameraName={camera?.name ?? cameraId}
          context={context}
          environments={environments}
          environmentId={environment.id}
          onSave={(body) => placement.updateCamera(Number(cameraId), body)}
        />
      ) : null}
    </Panel>
  );
}
