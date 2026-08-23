import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { ZoneModel } from '@/core/database';
import type { IServiceResponse, IZoneCreate, IZoneUpdate } from '@/core/interfaces';
import { DatabaseService } from './database.service';
import { httpService } from './http.service';

class ZoneService extends DatabaseService<'zone'> {
  constructor() {
    super('zone');
  }

  observeByCamera(cameraId: string): Observable<ZoneModel[]> {
    return this.observeManyWithColumns(
      ['name', 'points', 'zone_type', 'color', 'is_enabled'],
      [Q.where('camera_id', cameraId), Q.sortBy('name', Q.asc)],
    );
  }

  observeEnabledByCamera(cameraId: string): Observable<ZoneModel[]> {
    return this.observeManyWithColumns(
      ['points', 'zone_type', 'color'],
      [Q.where('camera_id', cameraId), Q.where('is_enabled', true)],
    );
  }

  observeForCache(): Observable<ZoneModel[]> {
    return this.observeManyWithColumns(
      ['camera_id', 'name', 'points', 'zone_type', 'color', 'is_enabled'],
      [Q.sortBy('name', Q.asc)],
    );
  }

  create(body: IZoneCreate): Promise<IServiceResponse<unknown>> {
    return httpService.post('/zone', body);
  }

  update(id: string, body: IZoneUpdate): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/zone/${id}`, body);
  }

  remove(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/zone/${id}`);
  }
}

export const zoneService = new ZoneService();
