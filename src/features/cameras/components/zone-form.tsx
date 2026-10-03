import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { z } from 'zod';
import { zoneService } from '@/core/services/zone.service';
import type { IZoneCacheRow } from '@/core/interfaces';
import type { MenuOption, ZoneType } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormScroll,
} from '@/shared/components/ui/form';
import { FormScrollView } from '@/shared/components/ui/form-scroll-view';
import { Input } from '@/shared/components/ui/input';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { ZONE_COLORS, ZONE_MAX_POINTS, ZONE_MIN_POINTS } from '@/features/cameras/constants';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { ZoneEditor } from '@/features/cameras/components/zone-editor';
import { CameraLiveView } from './camera-live-view';
import { CameraZonesOverlay } from '@/features/cameras/components/camera-zones-overlay';

type ZoneFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraId: string;
  zone?: IZoneCacheRow | null;
  zones?: readonly IZoneCacheRow[];
};

const schema = z.object({
  name: z.string().trim().min(1, 'common.validation.required').max(120, 'common.validation.too-long'),
  zoneType: z.enum(['monitor', 'alert', 'exclude']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'common.validation.invalid-color'),
  points: z
    .array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }))
    .min(ZONE_MIN_POINTS, 'common.validation.min-points')
    .max(ZONE_MAX_POINTS, 'common.validation.too-long'),
});

type ZoneFormValues = z.infer<typeof schema>;

const zoneBodyOf = (values: ZoneFormValues) => ({
  name: values.name,
  zoneType: values.zoneType,
  color: values.color,
  points: values.points,
});

export function ZoneForm({ open, onOpenChange, cameraId, zone, zones = [] }: ZoneFormProps) {
  const { t } = useTranslation();
  const formScroll = useFormScroll();
  const bodyHeight = useOverlayBodyHeight();
  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', zoneType: 'monitor', color: ZONE_COLORS[0], points: [] },
    mode: 'onBlur',
  });
  const others = useMemo(() => zones.filter((item) => item.id !== zone?.id), [zone?.id, zones]);

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: zone?.name ?? '',
      zoneType: (zone?.zoneType as ZoneType) ?? 'monitor',
      color: zone?.color || ZONE_COLORS[0],
      points: zone?.points ?? [],
    });
  }, [open, zone, form]);

  const typeOptions = useMemo<MenuOption<ZoneType>[]>(
    () => [
      { value: 'monitor', label: t('screens.cameras.zone-monitor') },
      { value: 'alert', label: t('screens.cameras.zone-alert') },
      { value: 'exclude', label: t('screens.cameras.zone-exclude') },
    ],
    [t]
  );
  const typeLabel = (value: ZoneType) => typeOptions.find((o) => o.value === value)?.label ?? '';

  const { submitting, submit } = useFormSubmit({
    form,
    formScroll,
    request: (values) =>
      zone
        ? zoneService.update(zone.id, zoneBodyOf(values))
        : zoneService.create({ ...zoneBodyOf(values), cameraId: Number(cameraId) }),
    optimistic: (values) => ({
      intents: [
        zone
          ? { table: 'zone', kind: 'update', recordId: zone.id, values: zoneBodyOf(values) }
          : { table: 'zone', kind: 'create', values: { ...zoneBodyOf(values), cameraId: Number(cameraId) } },
      ],
      success: t('screens.cameras.zone-saved'),
    }),
    onSuccess: () => onOpenChange(false),
  });

  const color = useWatch({ control: form.control, name: 'color' });

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={zone ? t('screens.cameras.edit-zone') : t('screens.cameras.add-zone')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" onPress={() => onOpenChange(false)} disabled={submitting}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button onPress={submit} disabled={submitting}>
            <Text>{submitting ? t('common.saving') : t('common.save')}</Text>
          </Button>
        </>
      }>
      <FormScrollView formScroll={formScroll} maxHeight={bodyHeight}>
        <Form {...form}>
          <View className="gap-3.5 pb-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.cameras.zone-name')}</FormLabel>
                  <FormControl>
                    <Input {...field} onChangeText={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zoneType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.cameras.zone-type')}</FormLabel>
                  <AdaptiveSelect
                    options={typeOptions}
                    value={field.value}
                    onChange={field.onChange}
                    title={t('screens.cameras.zone-type')}
                    closeLabel={t('common.close')}
                    searchPlaceholder={t('screens.home.search-placeholder')}
                    emptyLabel={t('screens.cameras.zones-empty')}
                    trigger={
                      <SelectField label={typeLabel(field.value)} />
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.cameras.zone-color')}</FormLabel>
                  <View className="flex-row gap-2">
                    {ZONE_COLORS.map((option) => (
                      <Pressable
                        key={option}
                        accessibilityRole="button"
                        accessibilityLabel={option}
                        accessibilityState={{ selected: field.value === option }}
                        onPress={() => field.onChange(option)}
                        className={cn(
                          'size-8 items-center justify-center rounded-full border-2',
                          field.value === option ? 'border-foreground' : 'border-transparent'
                        )}>
                        <View className="size-6 rounded-full" style={{ backgroundColor: option }} />
                      </Pressable>
                    ))}
                  </View>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <View className="flex-row items-center justify-between">
                    <FormLabel>{t('screens.cameras.zones')}</FormLabel>
                    <View className="flex-row items-center gap-3">
                      <Text variant="caption">
                        {t('screens.cameras.zone-points-count', {
                          count: String(field.value.length),
                        })}
                      </Text>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => field.onChange(field.value.slice(0, -1))}
                        disabled={field.value.length === 0}
                        className="active:opacity-70">
                        <Text variant="caption" className="text-foreground-secondary">
                          {t('screens.cameras.zone-undo')}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => field.onChange([])}
                        disabled={field.value.length === 0}
                        className="active:opacity-70">
                        <Text variant="caption" className="text-foreground-secondary">
                          {t('screens.cameras.zone-reset')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <ZoneEditor
                    points={field.value}
                    onChange={field.onChange}
                    color={color}
                    hint={t('screens.cameras.zone-points')}
                    background={
                      open ? (
                        <>
                          <CameraLiveView cameraId={cameraId} fill />
                          <CameraZonesOverlay zones={others} />
                        </>
                      ) : null
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </View>
        </Form>
      </FormScrollView>
    </AdaptiveDialog>
  );
}
