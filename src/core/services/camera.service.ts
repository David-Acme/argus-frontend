import { Q } from '@nozbe/watermelondb';
import type { Observable } from 'rxjs';
import type { CameraModel } from '@/core/database';
import type { ICameraCreate, ICameraDeviceStatus, ICameraSettings, ICameraUpdate, IServiceResponse } from '@/core/interfaces';
import { DatabaseService } from './database.service';
import { wordClauses, type PageSegment } from './paging';
import { SEARCH_PAGE_SIZE } from '@/shared/constants';
import { CAMERA_SOURCE_COLUMNS } from './view-cache/camera.projection';
import { httpService } from '@/core/services/http';

class CameraService extends DatabaseService<'camera'> {
  constructor() {
    super('camera');
  }

  search(words: readonly string[]): PageSegment<CameraModel> {
    return this.keysetSegment({
      clauses: wordClauses(['name'], words),
      sort: { column: 'created_at', order: 'asc' },
      columns: ['name'],
      pageSize: SEARCH_PAGE_SIZE,
    });
  }

  observeList(): Observable<CameraModel[]> {
    return this.observeManyWithColumns(CAMERA_SOURCE_COLUMNS, [Q.sortBy('name', Q.asc)]);
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

  settings(id: string, body: ICameraSettings): Promise<IServiceResponse<ICameraDeviceStatus>> {
    return httpService.patch(`/camera/${id}/settings`, body);
  }

  remove(id: string): Promise<IServiceResponse<unknown>> {
    return httpService.delete(`/camera/${id}`);
  }
}

export const cameraService = new CameraService();
