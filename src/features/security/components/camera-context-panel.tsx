import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardCameraContext, GuardCameraContextUpdate } from '@/core/types';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { CameraContextEditor } from '@/features/security/components/camera-context-editor';
import { CAMERA_ROLE_ICONS, CAMERA_ROLE_KEYS, WEEK_DAY_KEYS } from '@/features/security/constants';
import { parseHours, summarizeHours } from '@/features/security/model/hours';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type CameraContextPanelProps = {
  cameras: readonly ICameraCacheRow[];
  contexts: readonly GuardCameraContext[];
  onSave: (cameraId: number, body: GuardCameraContextUpdate) => Promise<boolean>;
  className?: string;
};

type CameraRowProps = {
  camera: ICameraCacheRow;
  context: GuardCameraContext | null;
  onPress: () => void;
};

const rowHover = Platform.select({ web: 'hover:bg-surface-secondary/60', default: '' });

function CameraRow({ camera, context, onPress }: CameraRowProps) {
  const { t } = useTranslation();
  const hours = parseHours(context?.activeHours ?? '');
  const parts = context
    ? [
        t(`screens.security.cameras.roles.${CAMERA_ROLE_KEYS[context.role]}`),
        context.outdoor ? t('screens.security.cameras.summary.outdoor') : t('screens.security.cameras.summary.indoor'),
        context.publicArea ? t('screens.security.cameras.summary.public') : null,
        hours.length > 0
          ? summarizeHours(hours, {
              day: (day) => t(`screens.security.site.days.${WEEK_DAY_KEYS[day] ?? 'mon'}`),
              everyDay: t('screens.security.site.every-day'),
            })
          : null,
      ].filter((part): part is string => part !== null)
    : [t('screens.security.cameras.not-set')];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={camera.name}
      accessibilityHint={parts.join(', ')}
      onPress={onPress}
      className={cn('-mx-2 flex-row items-center gap-3 rounded-2xl px-2 py-2.5 active:opacity-70', rowHover)}>
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
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="body" numberOfLines={1} className="font-medium">
          {camera.name}
        </Text>
        <Text variant="caption" numberOfLines={2}>
          {parts.join(' · ')}
        </Text>
      </View>
      <Icon name="chevron-right" className="text-muted-foreground size-4" />
    </Pressable>
  );
}

export function CameraContextPanel({ cameras, contexts, onSave, className }: CameraContextPanelProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<ICameraCacheRow | null>(null);
  const byCamera = useMemo(
    () => new Map(contexts.map((context) => [String(context.cameraId), context])),
    [contexts]
  );
  const described = cameras.filter((camera) => byCamera.has(camera.id)).length;
  const editingContext = editing ? (byCamera.get(editing.id) ?? null) : null;

  return (
    <Panel
      title={t('screens.security.cameras.title')}
      description={t('screens.security.cameras.description')}
      count={cameras.length - described}
      className={className}>
      {cameras.length === 0 ? (
        <EmptyState
          variant="panel"
          icon="camera"
          title={t('screens.security.cameras.empty')}
          hint={t('screens.security.cameras.empty-hint')}
        />
      ) : (
        <View className="gap-0.5">
          {cameras.map((camera) => (
            <CameraRow
              key={camera.id}
              camera={camera}
              context={byCamera.get(camera.id) ?? null}
              onPress={() => setEditing(camera)}
            />
          ))}
        </View>
      )}
      {editing ? (
        <CameraContextEditor
          key={editing.id}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          cameraName={editing.name}
          context={editingContext}
          onSave={(body) => onSave(Number(editing.id), body)}
        />
      ) : null}
    </Panel>
  );
}
