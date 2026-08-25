import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { CameraModel } from '@/core/database';
import type { ICameraCreate, ICameraUpdate, IServiceResponse } from '@/core/interfaces';
import { DatabaseService } from './database.service';
import { httpService } from '@/core/services/http';

class CameraService extends DatabaseService<'camera'> {
  constructor() {
    super('camera');
  }

  observeList(): Observable<CameraModel[]> {
    return this.observeManyWithColumns(
      ['name', 'manufacturer', 'model', 'ip', 'icon', 'is_online', 'is_enabled', 'record_mode'],
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

  create(body: ICameraCreate): Promise<IServiceResponse<unknown>> {
    return httpService.post('/camera', body);
  }

  update(id: string, body: ICameraUpdate): Promise<IServiceResponse<unknown>> {
    return httpService.patch(`/camera/${id}`, body);
  }

  remove(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/camera/${id}`);
  }
}

export const cameraService = new CameraService();
