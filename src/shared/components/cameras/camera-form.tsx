import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
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
import { Input } from '@/shared/components/ui/input';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { CAMERA_DRIVER_SPECS, CAMERA_ICONS } from '@/shared/constants';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { IconPickerButton } from './icon-picker-button';

type CameraFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; absent when connecting a new camera. */
  camera?: ICameraCacheRow | null;
  trigger?: ReactNode;
};

const HOST_RE = /^[a-zA-Z0-9.\-:]+$/;

const schema = z
  .object({
    driver: z.enum(['tapo', 'onvif', 'rtsp']),
    icon: z.string().min(1),
    name: z
      .string()
      .trim()
      .min(1, 'common.validation.required')
      .max(120, 'common.validation.too-long'),
    ip: z
      .string()
      .trim()
      .min(1, 'common.validation.required')
      .max(64, 'common.validation.too-long')
      .regex(HOST_RE, 'common.validation.invalid-ip'),
    port: z
      .string()
      .trim()
      .refine((value) => {
        const port = Number(value);
        return Number.isInteger(port) && port >= 1 && port <= 65535;
      }, 'common.validation.invalid-port'),
    username: z.string().trim().max(80, 'common.validation.too-long'),
    password: z.string(),
    cloudUsername: z.string().trim().max(120, 'common.validation.too-long'),
    cloudPassword: z.string(),
    manufacturer: z.string().trim().max(80, 'common.validation.too-long'),
    model: z.string().trim().max(80, 'common.validation.too-long'),
    recordMode: z.enum(['events', 'continuous']),
    /** Only for edit: an empty secret means "keep the stored one". */
    isEdit: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!CAMERA_DRIVER_SPECS[values.driver].requiresCloud) return;
    // Talking and moving a Tapo go through the cloud account, not the local
    // stream: without them the camera connects but half of Argus is dead.
    if (values.cloudUsername.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['cloudUsername'],
        message: 'common.validation.required',
      });
    }
    if (!values.isEdit && values.cloudPassword.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['cloudPassword'],
        message: 'common.validation.required',
      });
    }
  });

type CameraFormValues = z.infer<typeof schema>;

function defaultsFor(driver: CameraDriverKind, isEdit: boolean): CameraFormValues {
  const spec = CAMERA_DRIVER_SPECS[driver];
  return {
    driver,
    icon: 'video',
    name: '',
    ip: '',
    port: String(spec.port),
    username: spec.username,
    password: '',
    cloudUsername: '',
    cloudPassword: '',
    manufacturer: spec.manufacturer,
    model: '',
    recordMode: 'events',
    isEdit,
  };
}

export function CameraForm({ open, onOpenChange, camera, trigger }: CameraFormProps) {
  const { t } = useTranslation();
  const formScroll = useFormScroll();
  const bodyHeight = useOverlayBodyHeight();
  const isEdit = Boolean(camera);

  const form = useForm<CameraFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultsFor('tapo', false),
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    if (!camera) {
      form.reset(defaultsFor('tapo', false));
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

  /** Switching integration re-seeds the values that belong to the old one. */
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
      const body: ICameraCreate & ICameraUpdate = {
        name: values.name,
        ip: values.ip,
        port: Number(values.port),
        manufacturer: values.manufacturer || undefined,
        model: values.model || undefined,
        username: values.username || undefined,
        recordMode: values.recordMode,
        driver: values.driver,
        cloudUsername: CAMERA_DRIVER_SPECS[values.driver].requiresCloud
          ? values.cloudUsername
          : '',
        icon: values.icon,
      };
      // An empty secret on edit means "leave the stored one alone".
      if (values.password) body.password = values.password;
      if (values.cloudPassword) body.cloudPassword = values.cloudPassword;
      return camera ? cameraService.update(camera.id, body) : cameraService.create(body);
    },
    onSuccess: () => {
      toast.success(t('screens.cameras.saved'));
      onOpenChange(false);
    },
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
            {/* The integration comes first: it decides what the rest asks for. */}
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
                <FormField
                  control={form.control}
                  name="ip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('screens.cameras.ip-label')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="192.168.1.50"
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                          {...field}
                          onChangeText={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('screens.cameras.user-label')}</FormLabel>
                      <FormControl>
                        <Input
                          autoCapitalize="none"
                          autoCorrect={false}
                          {...field}
                          onChangeText={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </View>
              <View className="min-w-0 flex-1">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('screens.cameras.password-label')}</FormLabel>
                      <FormControl>
                        <Input
                          secureTextEntry
                          placeholder={isEdit ? '••••••••' : undefined}
                          autoCapitalize="none"
                          autoCorrect={false}
                          {...field}
                          onChangeText={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </View>
            </View>

            {spec.requiresCloud ? (
              <View className="flex-row gap-3">
                <View className="min-w-0 flex-1">
                  <FormField
                    control={form.control}
                    name="cloudUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('screens.cameras.cloud-user')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="you@email.com"
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            {...field}
                            onChangeText={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <FormField
                    control={form.control}
                    name="cloudPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('screens.cameras.cloud-password')}</FormLabel>
                        <FormControl>
                          <Input
                            secureTextEntry
                            placeholder={isEdit ? '••••••••' : undefined}
                            autoCapitalize="none"
                            autoCorrect={false}
                            {...field}
                            onChangeText={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
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
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('screens.cameras.form.model')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={driver === 'tapo' ? 'C225' : undefined}
                          {...field}
                          onChangeText={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </View>
            </View>

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
