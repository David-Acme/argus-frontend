import { describe, expect, test } from 'bun:test';
import { cameraDeviceStatusSchema, cameraSettingsSchema } from '@/core/contracts/http.contract';

describe('the shapes the privacy toggle reads and writes', () => {
  test('the status carries the state, unknown included', () => {
    expect(cameraDeviceStatusSchema.parse({ privacyEnabled: null }).privacyEnabled).toBeNull();
    expect(cameraDeviceStatusSchema.parse({ privacyEnabled: true }).privacyEnabled).toBe(true);
    expect(cameraDeviceStatusSchema.parse({ privacyEnabled: false }).privacyEnabled).toBe(false);
    expect(cameraDeviceStatusSchema.parse({}).privacyEnabled).toBeUndefined();
    expect(cameraDeviceStatusSchema.safeParse({ privacyEnabled: 'on' }).success).toBe(false);
  });

  test('the whole device answer reads, and what the app reads off it survives', () => {
    const answer = {
      ok: true,
      model: 'C225',
      firmware: '1.3.9',
      mac: 'AA:BB:CC:DD:EE:FF',
      privacyEnabled: null,
      ledEnabled: true,
      motionEnabled: false,
      autoTrackEnabled: false,
      dayNightMode: 'auto',
      motionSensitivity: 50,
      sdCard: { status: 'normal', total: '119.0G', free: '90.0G' },
      video: {
        resolution: '2K',
        frameRate: 15,
        encoding: 'h264',
        frameRates: [15, 20],
        resolutions: ['2K', '1080P'],
      },
    };
    expect(cameraDeviceStatusSchema.parse(answer)).toEqual(answer);
  });

  test('the settings body takes what the rows send and refuses what the camera would', () => {
    expect(cameraSettingsSchema.parse({ privacy: true })).toEqual({ privacy: true });
    expect(cameraSettingsSchema.parse({ dayNight: 'night', motionSensitivity: 100 })).toEqual({
      dayNight: 'night',
      motionSensitivity: 100,
    });
    expect(cameraSettingsSchema.safeParse({ dayNight: 'dusk' }).success).toBe(false);
    expect(cameraSettingsSchema.safeParse({ motionSensitivity: 0 }).success).toBe(false);
    expect(cameraSettingsSchema.safeParse({ motionSensitivity: 101 }).success).toBe(false);
    expect(cameraSettingsSchema.safeParse({ alarmVolume: 101 }).success).toBe(false);
  });
});
