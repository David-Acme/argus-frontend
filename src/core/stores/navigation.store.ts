import { create } from 'zustand';

type NavigationStoreState = {
  owner: string | null;
  requested: boolean;
  hidden: boolean;
  claim: (owner: string, wanted: boolean) => void;
  release: (owner: string) => void;
  setHidden: (hidden: boolean) => void;
};

export const useNavigationStore = create<NavigationStoreState>((set, get) => ({
  owner: null,
  requested: false,
  hidden: false,
  claim: (owner, wanted) => set({ owner, requested: wanted, hidden: false }),
  release: (owner) => {
    if (get().owner !== owner) return;
    set({ owner: null, requested: false });
  },
  setHidden: (hidden) => set({ hidden }),
}));

export const selectBottomNavVisible = (state: NavigationStoreState): boolean =>
  state.requested && !state.hidden;
