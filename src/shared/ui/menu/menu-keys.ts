export type MenuKey = { key: string; shiftKey: boolean };

export function opensContextMenu({ key, shiftKey }: MenuKey): boolean {
  return key === 'ContextMenu' || (shiftKey && key === 'F10');
}
