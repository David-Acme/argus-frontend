import { Q } from '@nozbe/watermelondb';
import { map } from 'rxjs/operators';
import type { Observable } from 'rxjs';
import type { CameraStreamModel } from '@/core/database';
import { DatabaseService } from './database.service';

class CameraStreamService extends DatabaseService<'camera_stream'> {
  constructor() {
    super('camera_stream');
  }

  observeByCamera(cameraId: string): Observable<CameraStreamModel[]> {
    return this.observeManyWithColumns(
      ['label', 'resolution', 'fps', 'codec', 'is_primary', 'is_enabled'],
      [Q.where('camera_id', cameraId), Q.sortBy('is_primary', Q.desc)],
    );
  }

  observePrimaries(): Observable<CameraStreamModel[]> {
    return this.observeManyWithColumns(
      ['camera_id', 'resolution', 'fps', 'codec', 'is_primary', 'is_enabled'],
      [Q.where('is_primary', true), Q.where('is_enabled', true)],
    );
  }

  observePrimaryByCamera(cameraId: string): Observable<CameraStreamModel | null> {
    return this.observeManyWithColumns(
      ['url', 'resolution'],
      [
        Q.where('camera_id', cameraId),
        Q.where('is_primary', true),
        Q.where('is_enabled', true),
        Q.take(1),
      ],
    ).pipe(map((streams) => streams[0] ?? null));
  }
}

export const cameraStreamService = new CameraStreamService();
