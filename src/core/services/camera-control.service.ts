import type {
  ICameraCapabilities,
  ICameraDeviceStatus,
  ICameraPreset,
  ICameraPtz,
  ICameraSettings,
  ICameraTalk,
  IServiceResponse,
} from '@/core/interfaces';
import { httpService } from './http.service';

/**
 * Talks to the camera itself, not to the local database: these calls reach the
 * device through the server, so nothing here is synced or cached.
 */
class CameraControlService {
  status(id: string): Promise<IServiceResponse<ICameraDeviceStatus>> {
    return httpService.get(`/camera/${id}/status`);
  }

  presets(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.get(`/camera/${id}/presets`);
  }

  move(id: string, body: ICameraPtz): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/camera/${id}/ptz`, body);
  }

  preset(id: string, body: ICameraPreset): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/camera/${id}/preset`, body);
  }

  capabilities(id: string): Promise<IServiceResponse<ICameraCapabilities>> {
    return httpService.get(`/camera/${id}/capabilities`);
  }

  /** Synthesizes the text on the server and plays it on the camera speaker. */
  talk(id: string, body: ICameraTalk): Promise<IServiceResponse<unknown>> {
    return httpService.post(`/camera/${id}/talk`, body);
  }

  settings(id: string, body: ICameraSettings): Promise<IServiceResponse<ICameraDeviceStatus>> {
    return httpService.patch(`/camera/${id}/settings`, body);
  }
}

export const cameraControlService = new CameraControlService();
