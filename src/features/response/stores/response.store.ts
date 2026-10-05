import { create } from 'zustand';
import type { IncidentResponse } from '@/core/types';
import { mergeResponse } from '@/features/response/model/response';

type ResponseStoreState = {
  ownerId: string | null;
  responses: Record<number, IncidentResponse>;
  apply: (response: IncidentResponse) => void;
  replaceAll: (responses: readonly IncidentResponse[]) => void;
  resetFor: (ownerId: string | null) => void;
};

export const useResponseStore = create<ResponseStoreState>((set) => ({
  ownerId: null,
  responses: {},
  apply: (response) => set((state) => ({ responses: mergeResponse(state.responses, response) })),
  replaceAll: (responses) =>
    set((state) => ({
      responses: responses.reduce<Record<number, IncidentResponse>>(
        (merged, response) => mergeResponse(merged, response),
        { ...state.responses }
      ),
    })),
  resetFor: (ownerId) => set({ ownerId, responses: {} }),
}));
