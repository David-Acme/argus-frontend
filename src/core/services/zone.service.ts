import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { ZoneModel } from '@/core/database';
import { DatabaseService } from './database.service';

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
}

export const zoneService = new ZoneService();
