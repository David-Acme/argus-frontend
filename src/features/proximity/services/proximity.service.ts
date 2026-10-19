import {
  PROXIMITY_ROUTES,
  readProximityMe,
  readProximityReceivers,
  readProximitySensors,
} from '@/core/contracts/proximity.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import type {
  ProximityMe,
  ProximityReceiver,
  ProximityReceiverInput,
  ProximitySensor,
  ProximitySensorInput,
} from '@/core/types';

function parsed<T>(response: IServiceResponse<unknown>, read: (raw: unknown) => T | null): IServiceResponse<T> {
  if (!response.ok) return { ...response, info: null };
  const value = read(response.info);
  if (value === null) {
    return errorResponse(response.status, 'INVALID_RESPONSE', 'The proximity answer is not in the expected shape');
  }
  return { ...response, info: value };
}

class ProximityService {
  async me(): Promise<IServiceResponse<ProximityMe>> {
    return parsed(await httpService.get<unknown>(PROXIMITY_ROUTES.me), readProximityMe);
  }

  async setBle(enabled: boolean): Promise<IServiceResponse<ProximityMe>> {
    return parsed(await httpService.put<unknown>(PROXIMITY_ROUTES.me, { ble: enabled }), readProximityMe);
  }

  async receivers(): Promise<IServiceResponse<ProximityReceiver[]>> {
    return parsed(await httpService.get<unknown>(PROXIMITY_ROUTES.receivers), readProximityReceivers);
  }

  addReceiver(input: ProximityReceiverInput): Promise<IServiceResponse<unknown>> {
    return httpService.post<unknown>(PROXIMITY_ROUTES.receivers, input);
  }

  removeReceiver(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete<unknown>(PROXIMITY_ROUTES.receiver(id));
  }

  async sensors(): Promise<IServiceResponse<ProximitySensor[]>> {
    return parsed(await httpService.get<unknown>(PROXIMITY_ROUTES.sensors), readProximitySensors);
  }

  addSensor(input: ProximitySensorInput): Promise<IServiceResponse<unknown>> {
    return httpService.post<unknown>(PROXIMITY_ROUTES.sensors, input);
  }

  removeSensor(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete<unknown>(PROXIMITY_ROUTES.sensor(id));
  }
}

export const proximityService = new ProximityService();
