import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm, useWatch, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { Pressable, View } from 'react-native';
import { cameraService } from '@/core/services/camera.service';
import type { ICameraCacheRow, ICameraCatalogModel, ICameraProbeResult } from '@/core/interfaces';
import type { CameraDriverKind, CameraRecordMode, MenuOption, TranslationKey } from '@/core/types';
import { CameraIllustration } from '@/features/cameras/components/camera-illustration';
import { CameraModelPicker, FORM_FACTOR_LABEL } from '@/features/cameras/components/camera-model-picker';
import { CameraProbePanel } from '@/features/cameras/components/camera-probe-panel';
import { IconPickerButton } from '@/features/cameras/components/icon-picker-button';
import {
  cameraFormDefaults,
  cameraFormSchema,
  type CameraFormValues,
} from '@/features/cameras/components/camera-form-schema';
import { CAMERA_DRIVER_SPECS, CAMERA_ICONS } from '@/features/cameras/constants';
import { useCameraCatalog } from '@/features/cameras/hooks/use-camera-catalog';
import { catalogLabel, catalogPrefill, findCatalogModel } from '@/features/cameras/model/camera-catalog';
import {
  DETAIL_FIELDS,
  cameraBodyOf,
  connectionFields,
  formSteps,
  nextStep,
  previousStep,
  probeInputOf,
  withCameraWriteCode,
  type CameraFormStep,
} from '@/features/cameras/model/camera-form-steps';
import { probeRefusalOf, type ProbeRefusal } from '@/features/cameras/model/camera-probe';
import { credentialsToRetype, RETENTION_DEFAULT_DAYS, retentionWithIncident } from '@/features/cameras/model/camera-retention';
import { cameraIntentValues } from '@/features/cameras/model/camera-optimistic';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { FilterChips } from '@/shared/components/ui/filter-chips';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useFormScroll } from '@/shared/components/ui/form';
import { FormScrollView } from '@/shared/components/ui/form-scroll-view';
import { FormTextField } from '@/shared/components/ui/form-text-field';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type CameraFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camera?: ICameraCacheRow | null;
  trigger?: ReactNode;
};

type StepperProps = {
  steps: readonly CameraFormStep[];
  current: CameraFormStep;
};

type ModelSummaryProps = {
  model: ICameraCatalogModel | null;
  driver: CameraDriverKind;
  onChange: () => void;
};

const STEP_LABEL = {
  model: 'screens.cameras.steps.model',
  connection: 'screens.cameras.steps.connection',
  test: 'screens.cameras.steps.test',
  details: 'screens.cameras.steps.details',
} as const satisfies Record<CameraFormStep, TranslationKey>;

const NOTE_LABEL: Record<string, TranslationKey> = {
  'tapo-camera-account': 'screens.cameras.catalog.note-tapo-account',
  'tapo-doorbell-wired': 'screens.cameras.catalog.note-doorbell-wired',
  'safety-code-password': 'screens.cameras.catalog.note-safety-code',
  'verification-code-password': 'screens.cameras.catalog.note-verification-code',
  'reolink-h265': 'screens.cameras.catalog.note-reolink',
  'custom-paths': 'screens.cameras.catalog.note-custom-paths',
};

const NAME_SUGGESTIONS = [
  'screens.cameras.suggest-entrance',
  'screens.cameras.suggest-yard',
  'screens.cameras.suggest-garage',
  'screens.cameras.suggest-living-room',
  'screens.cameras.suggest-kitchen',
  'screens.cameras.suggest-hallway',
] as const satisfies readonly TranslationKey[];

function Stepper({ steps, current }: StepperProps) {
  const { t } = useTranslation();
  const index = steps.indexOf(current);
  return (
    <View className="flex-row items-center gap-2 pb-1" accessibilityRole="progressbar">
      {steps.map((step, position) => {
        const done = position < index;
        const active = position === index;
        return (
          <View key={step} className="min-w-0 flex-1 gap-1.5">
            <View className={cn('h-1 rounded-full', done || active ? 'bg-accent' : 'bg-surface-secondary')} />
            <Text
              variant="micro"
              numberOfLines={1}
              className={cn(active ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
              {t(STEP_LABEL[step])}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ModelSummary({ model, driver, onChange }: ModelSummaryProps) {
  const { t } = useTranslation();
  const note = model ? NOTE_LABEL[model.note] : undefined;
  return (
    <View className="bg-surface-secondary dark:bg-card-secondary gap-2 rounded-2xl p-3">
      <View className="flex-row items-center gap-3">
        <CameraIllustration formFactor={model?.formFactor ?? (driver === 'tapo' ? 'pan-tilt' : 'bullet')} size={64} />
        <View className="min-w-0 flex-1">
          <Text variant="label" numberOfLines={1}>
            {model ? catalogLabel(model) : t(`screens.cameras.driver-${driver}`)}
          </Text>
          <Text variant="caption" numberOfLines={1}>
            {model ? t(FORM_FACTOR_LABEL[model.formFactor]) : t('screens.cameras.catalog.unknown-model')}
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onChange} className="rounded-full px-3 py-2 active:opacity-70">
          <Text variant="label" className="text-accent-strong">
            {t('screens.cameras.catalog.change')}
          </Text>
        </Pressable>
      </View>
      {note ? <Text variant="caption">{t(note)}</Text> : null}
    </View>
  );
}

export function CameraForm({ open, onOpenChange, camera, trigger }: CameraFormProps) {
  const { t } = useTranslation();
  const formScroll = useFormScroll();
  const bodyHeight = useOverlayBodyHeight();
  const isEdit = Boolean(camera);
  const steps = formSteps(isEdit);
  const [step, setStep] = useState<CameraFormStep>(steps[0] ?? 'connection');
  const [choosingModel, setChoosingModel] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState<ICameraProbeResult | null>(null);
  const [probeFailed, setProbeFailed] = useState(false);
  const [probeRefusal, setProbeRefusal] = useState<ProbeRefusal | null>(null);
  const probeRun = useRef(0);
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const { models, loading, failed, reload } = useCameraCatalog(open);

  const form = useForm<CameraFormValues>({
    resolver: zodResolver(cameraFormSchema),
    defaultValues: cameraFormDefaults('tapo', false),
    mode: 'onBlur',
  });

  const driver = useWatch({ control: form.control, name: 'driver' });
  const catalogId = useWatch({ control: form.control, name: 'catalogId' });
  const modelText = useWatch({ control: form.control, name: 'model' });
  const ipText = useWatch({ control: form.control, name: 'ip' });
  const portText = useWatch({ control: form.control, name: 'port' });
  const usernameText = useWatch({ control: form.control, name: 'username' });
  const storedIp = useWatch({ control: form.control, name: 'storedIp' });
  const storedPort = useWatch({ control: form.control, name: 'storedPort' });
  const retype = credentialsToRetype({
    isEdit,
    ip: ipText,
    port: portText,
    storedIp,
    storedPort,
    username: usernameText,
    driver,
  });
  const spec = CAMERA_DRIVER_SPECS[driver];
  const selectedModel = useMemo(
    () => findCatalogModel(models, { catalogId, driver, model: modelText }),
    [catalogId, driver, modelText, models],
  );
  const visibleStep: CameraFormStep = choosingModel ? 'model' : step;

  const recordOptions = useMemo<MenuOption<CameraRecordMode>[]>(
    () => [
      { value: 'events', label: t('screens.cameras.form.record-events'), description: t('screens.cameras.record-hint') },
      { value: 'continuous', label: t('screens.cameras.form.record-continuous') },
    ],
    [t],
  );

  const runProbe = useCallback(async () => {
    const run = probeRun.current + 1;
    probeRun.current = run;
    setProbing(true);
    setProbeFailed(false);
    setProbeRefusal(null);
    setProbe(null);
    const response = await cameraControlService.probe(probeInputOf(form.getValues(), camera?.id));
    if (run !== probeRun.current) return;
    setProbing(false);
    if (!response.ok || !response.info) {
      setProbeFailed(true);
      setProbeRefusal(probeRefusalOf(response));
      return;
    }
    const result = response.info;
    setProbe(result);
    if (result.catalogId && !form.getValues('catalogId')) form.setValue('catalogId', result.catalogId);
    if (result.device.model && !form.getValues('model')) form.setValue('model', result.device.model);
  }, [camera?.id, form]);

  const chooseModel = useCallback(
    (model: ICameraCatalogModel) => {
      const prefill = catalogPrefill(model);
      const values = form.getValues();
      const previous = CAMERA_DRIVER_SPECS[values.driver];
      form.setValue('catalogId', prefill.catalogId);
      form.setValue('driver', prefill.driver);
      form.setValue('manufacturer', prefill.manufacturer);
      form.setValue('model', prefill.model);
      if (!isEdit || values.port === String(previous.port)) form.setValue('port', prefill.port);
      if (!isEdit || !values.username) form.setValue('username', prefill.username);
      form.setValue('streamPath', prefill.streamPath);
      form.setValue('subStreamPath', prefill.subStreamPath);
      if (!CAMERA_DRIVER_SPECS[prefill.driver].requiresCloud) {
        form.setValue('cloudUsername', '');
        form.setValue('cloudPassword', '');
      }
      setProbe(null);
      setChoosingModel(false);
      setStep('connection');
    },
    [form, isEdit],
  );

  const { submitting, submit } = useFormSubmit({
    form,
    formScroll,
    request: (values) => {
      const body = cameraBodyOf(values);
      return (camera ? cameraService.update(camera.id, body) : cameraService.create(body)).then(withCameraWriteCode);
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

  const goBack = useCallback(() => {
    if (choosingModel) {
      setChoosingModel(false);
      return;
    }
    const previous = previousStep(steps, step);
    if (previous) setStep(previous);
    else onOpenChange(false);
  }, [choosingModel, onOpenChange, step, steps]);

  const goNext = useCallback(async () => {
    if (visibleStep === 'model') {
      if (selectedModel) chooseModel(selectedModel);
      return;
    }
    if (step === 'connection') {
      const valid = await form.trigger(connectionFields(form.getValues()));
      if (!valid) {
        formScroll.scrollToFirstError(form as unknown as UseFormReturn<FieldValues>);
        return;
      }
      setStep('test');
      void runProbe();
      return;
    }
    if (step === 'details') {
      const valid = await form.trigger([...DETAIL_FIELDS]);
      if (valid) await submit();
      return;
    }
    const next = nextStep(steps, step);
    if (next) setStep(next);
  }, [chooseModel, form, formScroll, runProbe, selectedModel, step, steps, submit, visibleStep]);

  useEffect(() => {
    if (!open) return;
    probeRun.current += 1;
    if (!camera) {
      form.reset(cameraFormDefaults('tapo', false));
      return;
    }
    const cameraDriver = camera.driver ?? 'tapo';
    form.reset({
      driver: cameraDriver,
      icon: camera.icon || 'video',
      name: camera.name,
      ip: camera.ip,
      port: String(camera.port ?? CAMERA_DRIVER_SPECS[cameraDriver].port),
      username: camera.username ?? '',
      password: '',
      cloudUsername: camera.cloudUsername ?? '',
      cloudPassword: '',
      manufacturer: camera.manufacturer ?? '',
      model: camera.model ?? '',
      recordMode: camera.recordMode ?? 'events',
      streamPath: camera.streamPath,
      subStreamPath: camera.subStreamPath,
      catalogId: camera.catalogId,
      retentionDays: camera.retentionDays == null ? '' : String(camera.retentionDays),
      retentionIncident: camera.retentionIncident,
      isEdit: true,
      storedIp: camera.ip,
      storedPort: String(camera.port),
    });
  }, [open, camera, form]);

  const openKey = open ? (camera?.id ?? 'new') : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (openKey) {
      setProbe(null);
      setProbing(false);
      setProbeFailed(false);
      setProbeRefusal(null);
      setChoosingModel(false);
      setStep(steps[0] ?? 'connection');
    }
  }

  const primaryLabel =
    visibleStep === 'details'
      ? submitting
        ? t('common.saving')
        : t('common.save')
      : visibleStep === 'test' && probe && !probe.ok
        ? t('screens.cameras.probe.continue-anyway')
        : t('screens.cameras.steps.next');
  const primaryDisabled =
    submitting || (visibleStep === 'model' && !selectedModel) || (visibleStep === 'test' && probing);

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      size="wide"
      onSubmit={primaryDisabled ? undefined : () => void goNext()}
      title={isEdit ? t('screens.cameras.edit') : t('screens.cameras.connect')}
      description={
        isEdit
          ? t('screens.cameras.edit-description', { name: camera?.name ?? '' })
          : t('screens.cameras.connect-description')
      }
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" onPress={goBack} disabled={submitting}>
            <Text>{visibleStep === steps[0] && !choosingModel ? t('common.cancel') : t('screens.cameras.steps.back')}</Text>
          </Button>
          <Button onPress={() => void goNext()} disabled={primaryDisabled}>
            <Text>{primaryLabel}</Text>
          </Button>
        </>
      }>
      <FormScrollView formScroll={formScroll} maxHeight={bodyHeight}>
        <Form {...form}>
          <View className="gap-4 pb-1">
            {choosingModel ? null : <Stepper steps={steps} current={step} />}

            {visibleStep === 'model' ? (
              <View className="gap-3">
                <Text variant="caption">{t('screens.cameras.catalog.hint')}</Text>
                <CameraModelPicker
                  models={models}
                  loading={loading}
                  failed={failed}
                  selectedId={selectedModel?.id ?? ''}
                  onSelect={chooseModel}
                  onRetry={() => void reload()}
                />
              </View>
            ) : null}

            {visibleStep === 'connection' ? (
              <View className="gap-3.5">
                <ModelSummary model={selectedModel} driver={driver} onChange={() => setChoosingModel(true)} />
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
                    <FormTextField
                      control={form.control}
                      name="port"
                      label={t('screens.cameras.form.port')}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  <View className="min-w-[200px] flex-1">
                    <FormTextField
                      control={form.control}
                      name="username"
                      label={t('screens.cameras.user-label')}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  <View className="min-w-[200px] flex-1">
                    <FormTextField
                      control={form.control}
                      name="password"
                      label={t('screens.cameras.password-label')}
                      secureTextEntry
                      placeholder={isEdit && !retype.password ? '••••••••' : undefined}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>
                {retype.addressChanged ? (
                  <View className="bg-surface-secondary dark:bg-card-secondary flex-row gap-2.5 rounded-2xl px-3 py-2.5">
                    <Icon name="key-round" className="text-foreground-secondary mt-0.5 size-4" />
                    <Text variant="caption" className="flex-1">
                      {t('screens.cameras.address-changed')}
                    </Text>
                  </View>
                ) : null}
                {spec.requiresCloud ? (
                  <View className="gap-2">
                    <View className="flex-row flex-wrap gap-3">
                      <View className="min-w-[200px] flex-1">
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
                      <View className="min-w-[200px] flex-1">
                        <FormTextField
                          control={form.control}
                          name="cloudPassword"
                          label={t('screens.cameras.cloud-password')}
                          secureTextEntry
                          placeholder={isEdit && !retype.cloudPassword ? '••••••••' : undefined}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </View>
                    <Text variant="caption">{t('screens.cameras.cloud-hint')}</Text>
                  </View>
                ) : null}
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
                <View className="flex-row items-center gap-2">
                  <Icon name="shield-check" className="text-muted-foreground size-4" />
                  <Text variant="caption" className="flex-1">
                    {t('screens.cameras.form.password-hint')}
                  </Text>
                </View>
              </View>
            ) : null}

            {visibleStep === 'test' ? (
              <CameraProbePanel
                running={probing}
                result={probe}
                failedToRun={probeFailed}
                refusal={probeRefusal}
                onRetry={() => void runProbe()}
              />
            ) : null}

            {visibleStep === 'details' ? (
              <View className="gap-3.5">
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
                            <IconPickerButton options={CAMERA_ICONS} value={iconField.value} onChange={iconField.onChange} />
                          )}
                        />
                        <View className="min-w-0 flex-1">
                          <FormControl>
                            <Input
                              placeholder={t('screens.cameras.form.name-placeholder')}
                              autoCapitalize="sentences"
                              returnKeyType="done"
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
                <View className="gap-2">
                  <Text variant="caption">{t('screens.cameras.name-suggestions')}</Text>
                  <FilterChips
                    options={NAME_SUGGESTIONS.map((key) => ({ value: key, label: t(key) }))}
                    value={null}
                    onChange={(key) => form.setValue('name', t(key), { shouldValidate: true })}
                    scroll
                  />
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
                          <SelectField label={recordOptions.find((option) => option.value === field.value)?.label} />
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <View className="gap-1.5">
                  <FormTextField
                    control={form.control}
                    name="retentionDays"
                    label={t('screens.cameras.retention.label')}
                    placeholder={String(RETENTION_DEFAULT_DAYS)}
                    keyboardType="number-pad"
                  />
                  <Text variant="caption">{t('screens.cameras.retention.hint')}</Text>
                </View>
                <FormField
                  control={form.control}
                  name="retentionIncident"
                  render={({ field }) => (
                    <ToggleRow
                      label={t('screens.cameras.retention.incident')}
                      hint={t('screens.cameras.retention.incident-hint')}
                      value={field.value}
                      onChange={(next) => {
                        field.onChange(next);
                        const days = form.getValues('retentionDays');
                        const clamped = retentionWithIncident(days, next);
                        if (clamped !== days) form.setValue('retentionDays', clamped);
                        void form.trigger('retentionDays');
                      }}
                    />
                  )}
                />
              </View>
            ) : null}
          </View>
        </Form>
      </FormScrollView>
    </AdaptiveDialog>
  );
}
