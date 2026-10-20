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
import { httpService } from '@/core/services/http';

function aimOf(result: IServiceResponse<unknown>): IServiceResponse<CameraAim> {
  if (!result.ok) return { status: result.status, ok: false, info: null, errors: result.errors };
  const parsed = cameraAimSchema.safeParse(result.info);
  if (!parsed.success) {
    return {
      status: result.status,
      ok: false,
      info: null,
      errors: { code: 'INVALID_RESPONSE', message: 'The camera answered an unexpected aim shape' },
    };
  }
  return { status: result.status, ok: true, info: parsed.data, errors: null };
}

function patrolOf(result: IServiceResponse<unknown>): IServiceResponse<CameraPatrolAnswer> {
  if (!result.ok) return { status: result.status, ok: false, info: null, errors: result.errors };
  const answer = readCameraPatrol(result.info);
  if (!answer) {
    return {
      status: result.status,
      ok: false,
      info: null,
      errors: { code: 'INVALID_RESPONSE', message: 'The camera answered an unexpected patrol shape' },
    };
  }
  return { status: result.status, ok: true, info: answer, errors: null };
}

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
    return aimOf(await httpService.get<unknown>(`/camera/${id}/aim`));
  }

  async setAim(id: string, body: CameraAimPatch): Promise<IServiceResponse<CameraAim>> {
    return aimOf(await httpService.patch<unknown>(`/camera/${id}/aim`, body));
  }

  async lease(id: string, action: CameraLeaseAction): Promise<IServiceResponse<CameraAim>> {
    return aimOf(await httpService.post<unknown>(`/camera/${id}/ptz/lease`, { action }));
  }

  async patrol(id: string): Promise<IServiceResponse<CameraPatrolAnswer>> {
    return patrolOf(await httpService.get<unknown>(CAMERA_PATROL_ROUTE(id)));
  }

  async setPatrol(id: string, body: CameraPatrolPatch): Promise<IServiceResponse<CameraPatrolAnswer>> {
    return patrolOf(await httpService.patch<unknown>(CAMERA_PATROL_ROUTE(id), body));
  }

  async removePatrol(id: string): Promise<IServiceResponse<CameraPatrolAnswer>> {
    return patrolOf(await httpService.delete<unknown>(CAMERA_PATROL_ROUTE(id)));
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
