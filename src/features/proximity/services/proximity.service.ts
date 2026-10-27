import {
  PROXIMITY_ROUTES,
  readProximityMe,
  readProximityPeople,
  readProximityReceivers,
  readProximitySensors,
} from '@/core/contracts/proximity.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { expectShape, httpService } from '@/core/services/http';
import type {
  ProximityMe,
  ProximityPerson,
  ProximityReceiver,
  ProximityReceiverInput,
  ProximitySensor,
  ProximitySensorInput,
} from '@/core/types';

class ProximityService {
  async me(): Promise<IServiceResponse<ProximityMe>> {
    return expectShape(
      await httpService.get<unknown>(PROXIMITY_ROUTES.me),
      readProximityMe,
      'The proximity answer'
    );
  }

  async setBle(enabled: boolean): Promise<IServiceResponse<ProximityMe>> {
    return expectShape(
      await httpService.put<unknown>(PROXIMITY_ROUTES.me, { ble: enabled }),
      readProximityMe,
      'The proximity answer'
    );
  }

  async receivers(): Promise<IServiceResponse<ProximityReceiver[]>> {
    return expectShape(
      await httpService.get<unknown>(PROXIMITY_ROUTES.receivers),
      readProximityReceivers,
      'The proximity answer'
    );
  }

  addReceiver(input: ProximityReceiverInput): Promise<IServiceResponse<unknown>> {
    return httpService.post<unknown>(PROXIMITY_ROUTES.receivers, input);
  }

  removeReceiver(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete<unknown>(PROXIMITY_ROUTES.receiver(id));
  }

  async sensors(): Promise<IServiceResponse<ProximitySensor[]>> {
    return expectShape(
      await httpService.get<unknown>(PROXIMITY_ROUTES.sensors),
      readProximitySensors,
      'The proximity answer'
    );
  }

  addSensor(input: ProximitySensorInput): Promise<IServiceResponse<unknown>> {
    return httpService.post<unknown>(PROXIMITY_ROUTES.sensors, input);
  }

  async people(): Promise<IServiceResponse<ProximityPerson[]>> {
    return expectShape(
      await httpService.get<unknown>(PROXIMITY_ROUTES.people),
      readProximityPeople,
      'The proximity answer'
    );
  }

  removeSensor(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete<unknown>(PROXIMITY_ROUTES.sensor(id));
  }
}

export const proximityService = new ProximityService();
