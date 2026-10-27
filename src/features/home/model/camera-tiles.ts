import { tileMoment, type MomentFormat } from '@/features/home/model/camera-moments';

export type CameraTileState = 'live' | 'private' | 'off' | 'offline';

export type CameraTileSource = {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'disabled';
  masked: boolean;
  lastEventAt: number | null;
};

export type CameraTile = { id: string; name: string; state: CameraTileState; at: number | null };

export const STRIP_CAMERAS = 6;

export const GRID_COLUMNS = 2;

const GRID_CAMERAS = 4;

const GRID_CAMERAS_WIDE = 6;

function stateOf(source: CameraTileSource): CameraTileState {
  if (source.status === 'disabled') return 'off';
  if (source.masked) return 'private';
  return source.status === 'online' ? 'live' : 'offline';
}

export function cameraTiles(sources: readonly CameraTileSource[], limit: number): CameraTile[] {
  const tiles = sources.map((source) => ({
    id: source.id,
    name: source.name,
    state: stateOf(source),
    at: source.lastEventAt,
  }));
  const live = tiles.filter((tile) => tile.state === 'live');
  const resting = tiles.filter((tile) => tile.state !== 'live');
  return [...live, ...resting].slice(0, limit);
}

export function gridLimit(wide: boolean): number {
  return wide ? GRID_CAMERAS_WIDE : GRID_CAMERAS;
}

export function gridColumns(count: number): number {
  return Math.min(GRID_COLUMNS, Math.max(1, count));
}

export function gridRows<T>(items: readonly T[], columns: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let start = 0; start < items.length; start += columns) {
    const row: (T | null)[] = items.slice(start, start + columns);
    while (row.length < columns) row.push(null);
    rows.push(row);
  }
  return rows;
}

export type TileDetailInput = { now: number; format: MomentFormat };

export function tileDetail(tile: CameraTile, { now, format }: TileDetailInput): string {
  if (tile.state === 'private') return format.t('screens.home.camera-sections.private');
  if (tile.state === 'off') return format.t('screens.home.camera-sections.off');
  if (tile.state === 'offline') return format.t('screens.home.camera-sections.offline');
  if (tile.at !== null) return tileMoment(tile.at, now, format);
  return format.t('screens.home.camera-sections.quiet');
}
