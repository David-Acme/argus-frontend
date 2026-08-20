import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { CameraModel } from '@/core/database';
import { DatabaseService } from './database.service';

class CameraService extends DatabaseService<'camera'> {
  constructor() {
    super('camera');
  }

  observeList(): Observable<CameraModel[]> {
    return this.observeManyWithColumns(
      ['name', 'is_online', 'is_enabled', 'record_mode'],
      [Q.sortBy('name', Q.asc)],
    );
  }

  observeEnabled(): Observable<CameraModel[]> {
    return this.observeManyWithColumns(
      ['name', 'is_online'],
      [Q.where('is_enabled', true), Q.sortBy('name', Q.asc)],
    );
  }

  observeOnlineCount(): Observable<number> {
    return this.observeTotal([Q.where('is_enabled', true), Q.where('is_online', true)]);
  }
}

export const cameraService = new CameraService();
