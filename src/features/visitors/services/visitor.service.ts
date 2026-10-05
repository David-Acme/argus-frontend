import type { z } from 'zod';
import {
  visitorCropCapabilitySchema,
  visitorCropImageSchema,
  visitorDetailSchema,
  visitorListSchema,
  visitorSettingsSchema,
} from '@/core/contracts/visitor.contract';
import type { IServiceResponse } from '@/core/interfaces';
import { httpService } from '@/core/services/http';
import { errorResponse } from '@/core/services/http/http-envelope';
import type {
  VisitorCategory,
  VisitorCropImage,
  VisitorCursor,
  VisitorDetail,
  RemotePage,
  VisitorSettings,
  VisitorSummary,
} from '@/core/types';
import { RemoteFeed } from '@/core/services/paging';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { VISITOR_PAGE_SIZE } from '@/features/visitors/constants';
import {
  compareVisitors,
  VISITOR_ALL_SCOPE,
  visitorQueryOf,
} from '@/features/visitors/model/visitor';

export type VisitorUpdate = {
  name?: string;
  category?: VisitorCategory;
  note?: string;
};

const visitorPath = (id: number) => `/visitor/${encodeURIComponent(String(id))}`;

function parsed<T>(response: IServiceResponse<unknown>, schema: z.ZodType<T>): IServiceResponse<T> {
  if (!response.ok) return { ...response, info: null };
  const result = schema.safeParse(response.info);
  if (!result.success) {
    return errorResponse(response.status, 'INVALID_RESPONSE', 'The visitor answer is not in the expected shape');
  }
  return { ...response, info: result.data };
}

class VisitorService {
  async page(
    scope: string,
    cursor: VisitorCursor | null
  ): Promise<IServiceResponse<RemotePage<VisitorSummary, VisitorCursor>>> {
    const { filter, search } = visitorQueryOf(scope);
    const params = new URLSearchParams({ limit: String(VISITOR_PAGE_SIZE), filter });
    if (search) params.set('q', search);
    if (cursor) {
      params.set('beforeSeen', String(cursor.lastSeenAt));
      params.set('beforeId', String(cursor.id));
    }
    const result = parsed(
      await httpService.get<unknown>(`/visitor?${params.toString()}`),
      visitorListSchema
    );
    if (!result.ok || !result.info) return { ...result, info: null };
    return {
      ...result,
      info: { rows: result.info.visitors, next: result.info.nextCursor ?? null },
    };
  }

  async detail(id: number): Promise<IServiceResponse<VisitorDetail>> {
    return parsed(await httpService.get<unknown>(visitorPath(id)), visitorDetailSchema);
  }

  async update(id: number, body: VisitorUpdate): Promise<IServiceResponse<VisitorDetail>> {
    return parsed(await httpService.patch<unknown>(visitorPath(id), body), visitorDetailSchema);
  }

  async merge(id: number, sourceIds: number[]): Promise<IServiceResponse<VisitorDetail>> {
    return parsed(await httpService.post<unknown>(`${visitorPath(id)}/merge`, { sourceIds }), visitorDetailSchema);
  }

  async split(id: number, sampleIds: number[]): Promise<IServiceResponse<VisitorDetail>> {
    return parsed(await httpService.post<unknown>(`${visitorPath(id)}/split`, { sampleIds }), visitorDetailSchema);
  }

  remove(id: number): Promise<IServiceResponse<null>> {
    return httpService.delete<null>(visitorPath(id));
  }

  removeSample(id: number, sampleId: number): Promise<IServiceResponse<null>> {
    return httpService.delete<null>(`${visitorPath(id)}/samples/${encodeURIComponent(String(sampleId))}`);
  }

  async settings(): Promise<IServiceResponse<VisitorSettings>> {
    return parsed(await httpService.get<unknown>('/visitor-settings'), visitorSettingsSchema);
  }

  async updateSettings(unnamedRetentionDays: number): Promise<IServiceResponse<VisitorSettings>> {
    return parsed(
      await httpService.patch<unknown>('/visitor-settings', { unnamedRetentionDays }),
      visitorSettingsSchema
    );
  }

  async crop(id: number, sampleId?: number): Promise<IServiceResponse<VisitorCropImage>> {
    const query = sampleId ? `?sampleId=${encodeURIComponent(String(sampleId))}` : '';
    const capability = parsed(
      await httpService.get<unknown>(`${visitorPath(id)}/crop-preview${query}`),
      visitorCropCapabilitySchema
    );
    if (!capability.ok || !capability.info) return { ...capability, info: null };
    return parsed(
      await httpService.get<unknown>(`/visitor-crop/${encodeURIComponent(capability.info.token)}/content`),
      visitorCropImageSchema
    );
  }
}

export const visitorService = new VisitorService();

export const visitorFeed = new RemoteFeed<VisitorSummary, VisitorCursor>({
  key: VIEW_CACHE_KEYS.visitors,
  keyOf: (visitor) => String(visitor.id),
  compare: compareVisitors,
  fetch: (scope, cursor) => visitorService.page(scope, cursor),
  pinned: [VISITOR_ALL_SCOPE],
});
