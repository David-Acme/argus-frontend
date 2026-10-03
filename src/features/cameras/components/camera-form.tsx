import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { cameraService } from '@/core/services/camera.service';
import type { ICameraCacheRow, ICameraCreate, ICameraUpdate } from '@/core/interfaces';
import type { CameraDriverKind, CameraRecordMode, MenuOption } from '@/core/types';
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
import { FormTextField } from '@/shared/components/ui/form-text-field';
import { Input } from '@/shared/components/ui/input';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { CAMERA_DRIVER_SPECS, CAMERA_ICONS } from '@/features/cameras/constants';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useTranslation } from '@/shared/hooks/use-translation';
import { IconPickerButton } from '@/features/cameras/components/icon-picker-button';
import { cameraIntentValues } from '@/features/cameras/model/camera-optimistic';

import { cameraFormDefaults, cameraFormSchema, type CameraFormValues } from '@/features/cameras/components/camera-form-schema';

type CameraFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera?: ICameraCacheRow | null;
  trigger?: ReactNode;
};
function cameraBodyOf(values: CameraFormValues): ICameraCreate & ICameraUpdate {
  const spec = CAMERA_DRIVER_SPECS[values.driver];
  const body: ICameraCreate & ICameraUpdate = {
    name: values.name,
    ip: values.ip,
    port: Number(values.port),
    manufacturer: values.manufacturer || undefined,
    model: values.model || undefined,
    username: values.username || undefined,
    recordMode: values.recordMode,
    driver: values.driver,
    cloudUsername: spec.requiresCloud ? values.cloudUsername : '',
    icon: values.icon,
  };
  if (spec.customPaths) {
    body.streamPath = values.streamPath;
    body.subStreamPath = values.subStreamPath;
  }
  if (values.password) body.password = values.password;
  if (values.cloudPassword) body.cloudPassword = values.cloudPassword;
  return body;
}

export function CameraForm({ open, onOpenChange, camera, trigger }: CameraFormProps) {
  const { t } = useTranslation();
  const formScroll = useFormScroll();
  const bodyHeight = useOverlayBodyHeight();
  const isEdit = Boolean(camera);

  const form = useForm<CameraFormValues>({
    resolver: zodResolver(cameraFormSchema),
    defaultValues: cameraFormDefaults('tapo', false),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    if (!camera) {
      form.reset(cameraFormDefaults('tapo', false));
      return;
    }
    const driver = (camera.driver as CameraDriverKind) ?? 'tapo';
    form.reset({
      driver,
      icon: camera.icon || 'video',
      name: camera.name,
      ip: camera.ip,
      port: String(camera.port ?? CAMERA_DRIVER_SPECS[driver].port),
      username: camera.username ?? '',
      password: '',
      cloudUsername: camera.cloudUsername ?? '',
      cloudPassword: '',
      manufacturer: camera.manufacturer ?? '',
      model: camera.model ?? '',
      recordMode: (camera.recordMode as CameraRecordMode) ?? 'events',
      streamPath: camera.streamPath,
      subStreamPath: camera.subStreamPath,
      isEdit: true,
    });
  }, [open, camera, form]);

  const driverOptions = useMemo<MenuOption<CameraDriverKind>[]>(
    () => [
      {
        value: 'tapo',
        label: t('screens.cameras.driver-tapo'),
        description: t('screens.cameras.driver-tapo-hint'),
        icon: 'video',
      },
      {
        value: 'onvif',
        label: t('screens.cameras.driver-onvif'),
        description: t('screens.cameras.driver-onvif-hint'),
        icon: 'video',
      },
      {
        value: 'rtsp',
        label: t('screens.cameras.driver-rtsp'),
        description: t('screens.cameras.driver-rtsp-hint'),
        icon: 'video',
      },
    ],
    [t]
  );

  const recordOptions = useMemo<MenuOption<CameraRecordMode>[]>(
    () => [
      { value: 'events', label: t('screens.cameras.form.record-events') },
      { value: 'continuous', label: t('screens.cameras.form.record-continuous') },
    ],
    [t]
  );

  const driver = useWatch({ control: form.control, name: 'driver' });
  const spec = CAMERA_DRIVER_SPECS[driver];

  const changeDriver = (next: CameraDriverKind) => {
    const previous = CAMERA_DRIVER_SPECS[form.getValues('driver')];
    const nextSpec = CAMERA_DRIVER_SPECS[next];
    form.setValue('driver', next, { shouldValidate: false });
    if (form.getValues('port') === String(previous.port)) {
      form.setValue('port', String(nextSpec.port));
    }
    if (form.getValues('username') === previous.username) {
      form.setValue('username', nextSpec.username);
    }
    if (form.getValues('manufacturer') === previous.manufacturer) {
      form.setValue('manufacturer', nextSpec.manufacturer);
    }
    if (!nextSpec.requiresCloud) {
      form.setValue('cloudUsername', '');
      form.setValue('cloudPassword', '');
    }
  };

  const { submitting, submit } = useFormSubmit({
    form,
    formScroll,
    request: (values) => {
      const body = cameraBodyOf(values);
      return camera ? cameraService.update(camera.id, body) : cameraService.create(body);
    },
    optimistic: (values) => ({
      intents: [
        camera
          ? { table: 'camera', kind: 'update', recordId: camera.id, values: cameraIntentValues(cameraBodyOf(values)) }
          : { table: 'camera', kind: 'create', values: cameraIntentValues(cameraBodyOf(values)) },
      ],
      success: t('screens.cameras.saved'),
    }),
    onSuccess: () => onOpenChange(false),
  });

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={isEdit ? t('screens.cameras.edit') : t('screens.cameras.connect')}
      description={
        isEdit
          ? t('screens.cameras.edit-description', { name: camera?.name ?? '' })
          : t('screens.cameras.connect-description')
      }
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
              name="driver"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.cameras.driver')}</FormLabel>
                  <AdaptiveSelect
                    options={driverOptions}
                    value={field.value}
                    onChange={changeDriver}
                    title={t('screens.cameras.driver')}
                    closeLabel={t('common.close')}
                    searchPlaceholder={t('screens.home.search-placeholder')}
                    emptyLabel={t('screens.cameras.zones-empty')}
                    trigger={
                      <SelectField
                        label={driverOptions.find((option) => option.value === field.value)?.label}
                      />
                    }
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.cameras.form.name')}</FormLabel>
                  <View className="flex-row items-start gap-2.5">
                    <FormField
                      control={form.control}
                      name="icon"
                      render={({ field: iconField }) => (
                        <IconPickerButton
                          options={CAMERA_ICONS}
                          value={iconField.value}
                          onChange={iconField.onChange}
                        />
                      )}
                    />
                    <View className="min-w-0 flex-1">
                      <FormControl>
                        <Input
                          placeholder={t('screens.cameras.form.name-placeholder')}
                          autoCapitalize="sentences"
                          returnKeyType="next"
                          {...field}
                          onChangeText={field.onChange}
                        />
                      </FormControl>
                    </View>
                  </View>
                  <FormMessage />
                </FormItem>
              )}
            />

            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <FormTextField
                  control={form.control}
                  name="ip"
                  label={t('screens.cameras.ip-label')}
                  placeholder="192.168.1.50"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
              <View className="w-24">
                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('screens.cameras.form.port')}</FormLabel>
                      <FormControl>
                        <Input keyboardType="number-pad" {...field} onChangeText={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <FormTextField
                  control={form.control}
                  name="username"
                  label={t('screens.cameras.user-label')}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View className="min-w-0 flex-1">
                <FormTextField
                  control={form.control}
                  name="password"
                  label={t('screens.cameras.password-label')}
                  secureTextEntry
                  placeholder={isEdit ? '••••••••' : undefined}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {spec.requiresCloud ? (
              <View className="flex-row gap-3">
                <View className="min-w-0 flex-1">
                  <FormTextField
                    control={form.control}
                    name="cloudUsername"
                    label={t('screens.cameras.cloud-user')}
                    placeholder="you@email.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <FormTextField
                    control={form.control}
                    name="cloudPassword"
                    label={t('screens.cameras.cloud-password')}
                    secureTextEntry
                    placeholder={isEdit ? '••••••••' : undefined}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('screens.cameras.form.manufacturer')}</FormLabel>
                      <FormControl>
                        <Input {...field} onChangeText={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </View>
              <View className="min-w-0 flex-1">
                <FormTextField
                  control={form.control}
                  name="model"
                  label={t('screens.cameras.form.model')}
                  placeholder={driver === 'tapo' ? 'C225' : undefined}
                />
              </View>
            </View>

            {spec.customPaths ? (
              <View className="gap-3">
                <FormTextField
                  control={form.control}
                  name="streamPath"
                  label={t('screens.cameras.stream-path')}
                  placeholder="/Streaming/Channels/101"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <FormTextField
                  control={form.control}
                  name="subStreamPath"
                  label={t('screens.cameras.sub-stream-path')}
                  placeholder="/Streaming/Channels/102"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text variant="caption">{t('screens.cameras.stream-path-hint')}</Text>
              </View>
            ) : null}

            <FormField
              control={form.control}
              name="recordMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.cameras.form.record-mode')}</FormLabel>
                  <AdaptiveSelect
                    options={recordOptions}
                    value={field.value}
                    onChange={field.onChange}
                    title={t('screens.cameras.form.record-mode')}
                    closeLabel={t('common.close')}
                    searchPlaceholder={t('screens.home.search-placeholder')}
                    emptyLabel={t('screens.cameras.zones-empty')}
                    trigger={
                      <SelectField
                        label={
                          field.value === 'continuous'
                            ? t('screens.cameras.form.record-continuous')
                            : t('screens.cameras.form.record-events')
                        }
                      />
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
