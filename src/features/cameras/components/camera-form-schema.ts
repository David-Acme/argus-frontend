import { z } from 'zod';

import type { CameraDriverKind } from '@/core/types';

import { CAMERA_DRIVER_SPECS } from '@/features/cameras/constants';
import { isLiteralAddress, isPrivateAddress, isStreamPath } from '@/features/cameras/model/camera-address';
import { credentialsToRetype, retentionIssue, RETENTION_DEFAULT_DAYS } from '@/features/cameras/model/camera-retention';

export const cameraFormSchema = z
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
      .refine(isLiteralAddress, 'common.validation.invalid-ip')
      .refine((value) => !isLiteralAddress(value) || isPrivateAddress(value), 'screens.cameras.ip-private'),
    port: z
      .string()
      .trim()
      .refine((value) => {
        const port = Number(value);
        return Number.isInteger(port) && port >= 1 && port <= 65535;
      }, 'common.validation.invalid-port'),
    username: z.string().trim().max(80, 'common.validation.too-long'),
    password: z.string().max(128, 'common.validation.too-long'),
    cloudUsername: z.string().trim().max(120, 'common.validation.too-long'),
    cloudPassword: z.string().max(128, 'common.validation.too-long'),
    manufacturer: z.string().trim().max(80, 'common.validation.too-long'),
    model: z.string().trim().max(80, 'common.validation.too-long'),
    recordMode: z.enum(['events', 'continuous']),
    streamPath: z.string().trim().refine(isStreamPath, 'screens.cameras.stream-path-invalid'),
    subStreamPath: z.string().trim().refine(isStreamPath, 'screens.cameras.stream-path-invalid'),
    catalogId: z.string(),
    retentionDays: z.string().trim(),
    retentionIncident: z.boolean(),
    isEdit: z.boolean(),
    storedIp: z.string(),
    storedPort: z.string(),
  })
  .superRefine((values, ctx) => {
    const retention = retentionIssue(values.retentionDays, values.retentionIncident);
    if (retention) ctx.addIssue({ code: 'custom', path: ['retentionDays'], message: retention });
    const retype = credentialsToRetype(values);
    if (retype.password && values.password.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'screens.cameras.retype-password' });
    }
    if (retype.cloudPassword && values.cloudPassword.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['cloudPassword'], message: 'screens.cameras.retype-password' });
    }
    if (!CAMERA_DRIVER_SPECS[values.driver].requiresCloud) return;
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

export type CameraFormValues = z.infer<typeof cameraFormSchema>;

export function cameraFormDefaults(driver: CameraDriverKind, isEdit: boolean): CameraFormValues {
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
    streamPath: '',
    subStreamPath: '',
    catalogId: '',
    retentionDays: isEdit ? '' : String(RETENTION_DEFAULT_DAYS),
    retentionIncident: false,
    isEdit,
    storedIp: '',
    storedPort: '',
  };
}
