import { z } from 'zod';

import type { CameraDriverKind } from '@/core/types';

import { CAMERA_DRIVER_SPECS } from '@/shared/constants';

const HOST_RE = /^[a-zA-Z0-9.\-:]+$/;

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
    isEdit: z.boolean(),
  })
  .superRefine((values, ctx) => {
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
    isEdit,
  };
}
