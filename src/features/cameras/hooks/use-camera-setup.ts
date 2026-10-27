import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import type { ICameraCacheRow, ICameraCatalogModel } from '@/core/interfaces';
import { cameraService } from '@/core/services/camera.service';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useFormSubmit } from '@/features/cameras/hooks/use-form-submit';
import {
  cameraFormDefaults,
  cameraFormSchema,
} from '@/features/cameras/components/camera-form-schema';
import type { CameraFormValues } from '@/features/cameras/components/camera-form-schema';
import { CAMERA_DRIVER_SPECS } from '@/features/cameras/constants';
import { useCameraCatalog } from '@/features/cameras/hooks/use-camera-catalog';
import { useCameraProbe } from '@/features/cameras/hooks/use-camera-probe';
import type { CameraProbe } from '@/features/cameras/hooks/use-camera-probe';
import {
  catalogPrefill,
  connectable,
  findCatalogModel,
} from '@/features/cameras/model/camera-catalog';
import {
  DETAIL_FIELDS,
  cameraBodyOf,
  connectionFields,
  formSteps,
  nextStep,
  previousStep,
  withCameraWriteCode,
} from '@/features/cameras/model/camera-form-steps';
import type { CameraFormStep } from '@/features/cameras/model/camera-form-steps';
import { cameraIntentValues } from '@/features/cameras/model/camera-optimistic';

export type CameraSetup = {
  form: UseFormReturn<CameraFormValues>;
  isEdit: boolean;
  steps: readonly CameraFormStep[];
  step: CameraFormStep;
  catalog: ReturnType<typeof useCameraCatalog>;
  selectedModel: ICameraCatalogModel | null;
  previewModel: ICameraCatalogModel | null;
  probe: CameraProbe;
  preview: (model: ICameraCatalogModel) => void;
  chooseModel: (model: ICameraCatalogModel) => void;
  openModels: () => void;
  back: (() => void) | null;
  next: () => Promise<void>;
};

export function cameraValuesOf(camera: ICameraCacheRow | null): CameraFormValues {
  if (!camera) return cameraFormDefaults('tapo', false);
  const driver = camera.driver ?? 'tapo';
  return {
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
    recordMode: camera.recordMode ?? 'events',
    streamPath: camera.streamPath,
    subStreamPath: camera.subStreamPath,
    catalogId: camera.catalogId,
    retentionDays: camera.retentionDays == null ? '' : String(camera.retentionDays),
    retentionIncident: camera.retentionIncident,
    isEdit: true,
    storedIp: camera.ip,
    storedPort: String(camera.port),
    noPassword: false,
    noCloudPassword: false,
  };
}

function useSave(
  form: UseFormReturn<CameraFormValues>,
  camera: ICameraCacheRow | null,
  onDone: () => void
) {
  const { t } = useTranslation();
  return useFormSubmit({
    form,
    request: (values) => {
      const body = cameraBodyOf(values);
      const write = camera ? cameraService.update(camera.id, body) : cameraService.create(body);
      return write.then(withCameraWriteCode);
    },
    optimistic: (values) => ({
      intents: [
        camera
          ? {
              table: 'camera',
              kind: 'update',
              recordId: camera.id,
              values: cameraIntentValues(cameraBodyOf(values)),
            }
          : { table: 'camera', kind: 'create', values: cameraIntentValues(cameraBodyOf(values)) },
      ],
      success: t('screens.cameras.saved'),
    }),
    onSuccess: onDone,
  });
}

function applyModel(
  form: UseFormReturn<CameraFormValues>,
  picked: ICameraCatalogModel,
  isEdit: boolean
) {
  const prefill = catalogPrefill(picked);
  const values = form.getValues();
  const previous = CAMERA_DRIVER_SPECS[values.driver];
  form.setValue('catalogId', prefill.catalogId, { shouldDirty: true });
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
}

export function useCameraSetup(camera: ICameraCacheRow | null, onDone: () => void): CameraSetup {
  const isEdit = camera !== null;
  const steps = formSteps(isEdit);
  const [step, setStep] = useState<CameraFormStep>(steps[0] ?? 'connection');
  const [choosingModel, setChoosingModel] = useState(false);
  const [previewId, setPreviewId] = useState('');
  const catalog = useCameraCatalog(true);
  const form = useForm<CameraFormValues>({
    resolver: zodResolver(cameraFormSchema),
    defaultValues: cameraValuesOf(camera),
    mode: 'onBlur',
  });
  const probe = useCameraProbe(form, camera?.id);
  const [catalogId, driver, model] = useWatch({
    control: form.control,
    name: ['catalogId', 'driver', 'model'],
  });
  const selectedModel = findCatalogModel(catalog.models, { catalogId, driver, model });
  const previewModel = catalog.models.find((entry) => entry.id === previewId) ?? selectedModel;
  const save = useSave(form, camera, onDone);
  const visible: CameraFormStep = choosingModel ? 'model' : step;

  const chooseModel = (picked: ICameraCatalogModel) => {
    applyModel(form, picked, isEdit);
    probe.forget();
    setChoosingModel(false);
    setStep('connection');
  };

  const next = async () => {
    if (visible === 'model') {
      if (previewModel && connectable(previewModel)) chooseModel(previewModel);
      return;
    }
    if (step === 'connection') {
      if (!(await form.trigger(connectionFields(form.getValues())))) return;
      setStep('test');
      void probe.run();
      return;
    }
    if (step === 'details') {
      if (await form.trigger([...DETAIL_FIELDS])) await save.submit();
      return;
    }
    const following = nextStep(steps, step);
    if (following) setStep(following);
  };

  const earlier = previousStep(steps, step);
  const back = choosingModel
    ? () => setChoosingModel(false)
    : earlier
      ? () => setStep(earlier)
      : null;

  return {
    form,
    isEdit,
    steps,
    step: visible,
    catalog,
    selectedModel,
    previewModel,
    probe,
    preview: (picked) => setPreviewId(picked.id),
    chooseModel,
    openModels: () => setChoosingModel(true),
    back,
    next,
  };
}
