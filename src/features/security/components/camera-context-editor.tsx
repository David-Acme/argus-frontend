import { useMemo, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { GuardCameraContext, GuardCameraContextUpdate, GuardCameraRole } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { HoursFields } from '@/features/security/components/hours-fields';
import {
  CAMERA_ROLE_ICONS,
  CAMERA_ROLE_KEYS,
  CAMERA_ROLE_OUTDOOR,
  CAMERA_ROLES,
} from '@/features/security/constants';
import { formatHours, parseHours, type HoursWindow } from '@/features/security/model/hours';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

type CameraContextEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraName: string;
  context: GuardCameraContext | null;
  onSave: (body: GuardCameraContextUpdate) => Promise<boolean>;
};

type Draft = {
  role: GuardCameraRole;
  outdoor: boolean;
  publicArea: boolean;
  ownHours: boolean;
  windows: HoursWindow[];
};

const tileHover = Platform.select({ web: 'hover:bg-surface-secondary/70', default: '' });

function draftFrom(context: GuardCameraContext | null): Draft {
  const windows = parseHours(context?.activeHours ?? '');
  return {
    role: context?.role ?? 'other',
    outdoor: context?.outdoor ?? false,
    publicArea: context?.publicArea ?? false,
    ownHours: windows.length > 0,
    windows,
  };
}

export function CameraContextEditor({
  open,
  onOpenChange,
  cameraName,
  context,
  onSave,
}: CameraContextEditorProps) {
  const { t } = useTranslation();
  const { isCompact } = useWindowClass();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(context));
  const [saving, setSaving] = useState(false);
  const invalid = draft.ownHours && draft.windows.some((window) => window.start === window.end);

  const placementOptions = useMemo(
    () => [
      { value: 'indoor' as const, label: t('screens.security.cameras.indoor') },
      { value: 'outdoor' as const, label: t('screens.security.cameras.outdoor') },
    ],
    [t]
  );

  const areaOptions = useMemo(
    () => [
      { value: 'private' as const, label: t('screens.security.cameras.private') },
      { value: 'public' as const, label: t('screens.security.cameras.public') },
    ],
    [t]
  );

  const chooseRole = (role: GuardCameraRole) =>
    setDraft((current) =>
      context === null
        ? {
            ...current,
            role,
            outdoor: CAMERA_ROLE_OUTDOOR.includes(role),
            publicArea: role === 'public_area',
          }
        : { ...current, role }
    );

  const save = async () => {
    setSaving(true);
    const saved = await onSave({
      role: draft.role,
      outdoor: draft.outdoor,
      publicArea: draft.publicArea,
      activeHours: draft.ownHours ? formatHours(draft.windows) : '',
    });
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.security.cameras.edit-title', { name: cameraName })}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" onPress={() => onOpenChange(false)} disabled={saving}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button onPress={save} loading={saving} disabled={invalid}>
            <Text>{t('common.save')}</Text>
          </Button>
        </>
      }>
      <View className="gap-5">
        <View className="gap-2">
          <Text variant="label">{t('screens.security.cameras.role')}</Text>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {CAMERA_ROLES.map((role) => {
              const active = draft.role === role;
              return (
                <Pressable
                  key={role}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => chooseRole(role)}
                  className={cn(
                    'min-h-12 flex-row items-center gap-2 rounded-2xl border px-3 py-2 active:opacity-80',
                    isCompact ? 'basis-[47%] grow' : 'basis-[31%] grow',
                    active ? 'bg-interactive border-interactive' : cn('bg-card border-border-subtle', tileHover)
                  )}>
                  <Icon
                    name={CAMERA_ROLE_ICONS[role]}
                    className={cn(
                      'size-4',
                      active ? 'text-foreground-on-interactive' : 'text-foreground-secondary'
                    )}
                  />
                  <Text
                    variant="label"
                    numberOfLines={1}
                    className={cn('flex-1', active ? 'text-foreground-on-interactive' : 'text-foreground')}>
                    {t(`screens.security.cameras.roles.${CAMERA_ROLE_KEYS[role]}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View className="gap-2">
          <Text variant="label">{t('screens.security.cameras.placement')}</Text>
          <SegmentedControl
            options={placementOptions}
            value={draft.outdoor ? 'outdoor' : 'indoor'}
            onChange={(next) => setDraft((current) => ({ ...current, outdoor: next === 'outdoor' }))}
            accessibilityLabel={t('screens.security.cameras.placement')}
          />
        </View>
        <View className="gap-2">
          <Text variant="label">{t('screens.security.cameras.area')}</Text>
          <SegmentedControl
            options={areaOptions}
            value={draft.publicArea ? 'public' : 'private'}
            onChange={(next) => setDraft((current) => ({ ...current, publicArea: next === 'public' }))}
            accessibilityLabel={t('screens.security.cameras.area')}
          />
          <Text variant="caption" className="px-1">
            {t('screens.security.cameras.public-hint')}
          </Text>
        </View>
        <View className="gap-2">
          <ToggleRow
            label={t('screens.security.cameras.own-hours')}
            hint={t('screens.security.cameras.own-hours-hint')}
            value={draft.ownHours}
            onChange={(next) =>
              setDraft((current) => ({
                ...current,
                ownHours: next,
                windows:
                  next && current.windows.length === 0
                    ? [{ days: [1, 2, 3, 4, 5], start: '09:00', end: '18:00' }]
                    : current.windows,
              }))
            }
          />
          {draft.ownHours ? (
            <HoursFields
              windows={draft.windows}
              onChange={(windows) => setDraft((current) => ({ ...current, windows }))}
            />
          ) : null}
        </View>
      </View>
    </AdaptiveDialog>
  );
}
