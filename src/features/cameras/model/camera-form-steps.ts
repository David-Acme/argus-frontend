import type { ICameraCreate, ICameraProbeInput, ICameraUpdate } from '@/core/interfaces';
import { CAMERA_DRIVER_SPECS } from '@/features/cameras/constants';
import type { CameraFormValues } from '@/features/cameras/components/camera-form-schema';

export type CameraFormStep = 'model' | 'connection' | 'test' | 'details';

export type CameraFormField = keyof CameraFormValues;

const CREATE_STEPS: readonly CameraFormStep[] = ['model', 'connection', 'test', 'details'];
const EDIT_STEPS: readonly CameraFormStep[] = ['connection', 'test', 'details'];

export function formSteps(isEdit: boolean): readonly CameraFormStep[] {
  return isEdit ? EDIT_STEPS : CREATE_STEPS;
}

export function nextStep(steps: readonly CameraFormStep[], current: CameraFormStep): CameraFormStep | null {
  const index = steps.indexOf(current);
  return index >= 0 && index + 1 < steps.length ? (steps[index + 1] ?? null) : null;
}

export function previousStep(steps: readonly CameraFormStep[], current: CameraFormStep): CameraFormStep | null {
  const index = steps.indexOf(current);
  return index > 0 ? (steps[index - 1] ?? null) : null;
}

export function connectionFields(values: Pick<CameraFormValues, 'driver'>): CameraFormField[] {
  const spec = CAMERA_DRIVER_SPECS[values.driver];
  const fields: CameraFormField[] = ['ip', 'port', 'username', 'password'];
  if (spec.requiresCloud) fields.push('cloudUsername', 'cloudPassword');
  if (spec.customPaths) fields.push('streamPath', 'subStreamPath');
  return fields;
}

export const DETAIL_FIELDS: readonly CameraFormField[] = ['name', 'icon', 'recordMode'];

export function probeInputOf(values: CameraFormValues, cameraId?: string): ICameraProbeInput {
  const spec = CAMERA_DRIVER_SPECS[values.driver];
  const input: ICameraProbeInput = {
    driver: values.driver,
    ip: values.ip.trim(),
    port: Number(values.port),
    username: values.username.trim(),
    password: values.password,
    cloudUsername: spec.requiresCloud ? values.cloudUsername.trim() : '',
    cloudPassword: spec.requiresCloud ? values.cloudPassword : '',
    streamPath: spec.customPaths ? values.streamPath.trim() : '',
    subStreamPath: spec.customPaths ? values.subStreamPath.trim() : '',
  };
  const id = Number(cameraId);
  if (Number.isInteger(id) && id > 0) input.cameraId = id;
  return input;
}

export function cameraBodyOf(values: CameraFormValues): ICameraCreate & ICameraUpdate {
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
    catalogId: values.catalogId,
  };
  if (spec.customPaths) {
    body.streamPath = values.streamPath;
    body.subStreamPath = values.subStreamPath;
  }
  if (values.password) body.password = values.password;
  if (values.cloudPassword) body.cloudPassword = values.cloudPassword;
  return body;
}
