import type {
  ICameraCapabilities,
  ICameraCatalog,
  ICameraOverview,
  ICameraProbeInput,
  ICameraProbeResult,
  ICameraDeviceStatus,
  ICameraPreset,
  ICameraPtz,
  ICameraSiren,
  ICameraSnapshot,
  ICameraTalk,
  ICameraWebRtcOffer,
  IServiceResponse,
} from '@/core/interfaces';
import type {
  CameraAim,
  CameraAimPatch,
  CameraLeaseAction,
  CameraPatrolAnswer,
  CameraPatrolPatch,
  CameraSirenResult,
} from '@/core/types';
import { cameraAimSchema } from '@/core/contracts/camera-sight.contract';
import { CAMERA_PATROL_ROUTE, readCameraPatrol } from '@/core/contracts/camera-patrol.contract';
import { expectShape, httpService } from '@/core/services/http';

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

  async aim(id: string): Promise<IServiceResponse<CameraAim>> {
    return expectShape(
      await httpService.get<unknown>(`/camera/${id}/aim`),
      cameraAimSchema,
      'The camera aim'
    );
  }

  async setAim(id: string, body: CameraAimPatch): Promise<IServiceResponse<CameraAim>> {
    return expectShape(
      await httpService.patch<unknown>(`/camera/${id}/aim`, body),
      cameraAimSchema,
      'The camera aim'
    );
  }

  async lease(id: string, action: CameraLeaseAction): Promise<IServiceResponse<CameraAim>> {
    return expectShape(
      await httpService.post<unknown>(`/camera/${id}/ptz/lease`, { action }),
      cameraAimSchema,
      'The camera aim'
    );
  }

  async patrol(id: string): Promise<IServiceResponse<CameraPatrolAnswer>> {
    return expectShape(
      await httpService.get<unknown>(CAMERA_PATROL_ROUTE(id)),
      readCameraPatrol,
      'The camera patrol'
    );
  }

  async setPatrol(
    id: string,
    body: CameraPatrolPatch
  ): Promise<IServiceResponse<CameraPatrolAnswer>> {
    return expectShape(
      await httpService.patch<unknown>(CAMERA_PATROL_ROUTE(id), body),
      readCameraPatrol,
      'The camera patrol'
    );
  }

  async removePatrol(id: string): Promise<IServiceResponse<CameraPatrolAnswer>> {
    return expectShape(
      await httpService.delete<unknown>(CAMERA_PATROL_ROUTE(id)),
      readCameraPatrol,
      'The camera patrol'
    );
  }

  capabilities(id: string): Promise<IServiceResponse<ICameraCapabilities>> {
    return httpService.get(`/camera/${id}/capabilities`);
  }

  talk(id: string, body: ICameraTalk): Promise<IServiceResponse<unknown>> {
    return httpService.post(`/camera/${id}/talk`, body);
  }

  siren(body: ICameraSiren): Promise<IServiceResponse<CameraSirenResult>> {
    return httpService.post('/guard/siren', body);
  }

  webrtc(id: number, body: ICameraWebRtcOffer): Promise<IServiceResponse<unknown>> {
    return httpService.post(`/camera/${id}/webrtc`, body);
  }

  snapshot(id: string): Promise<IServiceResponse<ICameraSnapshot>> {
    return httpService.get(`/camera/${id}/snapshot`);
  }

  catalog(): Promise<IServiceResponse<ICameraCatalog>> {
    return httpService.get('/camera/catalog');
  }

  overview(): Promise<IServiceResponse<ICameraOverview>> {
    return httpService.get('/camera/overview');
  }

  probe(body: ICameraProbeInput): Promise<IServiceResponse<ICameraProbeResult>> {
    return httpService.post('/camera/probe', body);
  }
}

export const cameraControlService = new CameraControlService();
