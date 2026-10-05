import type { ICameraRtcService } from '@/core/interfaces';
import { cameraRtcService as platformRtcService } from './camera-rtc';

export const cameraRtcService: ICameraRtcService = platformRtcService;
