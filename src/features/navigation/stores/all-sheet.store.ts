import { create } from 'zustand';

type AllSheetState = {
  open: boolean;
  full: boolean;
  show: (full?: boolean) => void;
  expand: () => void;
  close: () => void;
};

const useAllSheetStore = create<AllSheetState>((set) => ({
  open: false,
  full: false,
  show: (full = false) => set({ open: true, full }),
  expand: () => set({ full: true }),
  close: () => set({ open: false, full: false }),
}));

export const useAllSheetOpen = () => useAllSheetStore((state) => state.open);

export const useAllSheetFull = () => useAllSheetStore((state) => state.full);

export const useAllSheetActions = () => {
  const show = useAllSheetStore((state) => state.show);
  const expand = useAllSheetStore((state) => state.expand);
  const close = useAllSheetStore((state) => state.close);
  return { show, expand, close };
};
