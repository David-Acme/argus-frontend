import type { ICameraClip } from '@/core/interfaces';
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

export type ClipTile = { id: string; cameraId: string; cameraName: string; at: number };

export type StripItem = { kind: 'clip'; clip: ClipTile } | { kind: 'camera'; tile: CameraTile };

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

export function clipTiles(
  clips: readonly ICameraClip[],
  sources: readonly Pick<CameraTileSource, 'id' | 'name'>[],
  limit: number
): ClipTile[] {
  const names = new Map(sources.map((source) => [source.id, source.name]));
  return [...clips]
    .sort((left, right) => right.startedAt - left.startedAt)
    .flatMap((clip) => {
      const cameraName = names.get(clip.cameraId);
      return cameraName === undefined
        ? []
        : [{ id: clip.id, cameraId: clip.cameraId, cameraName, at: clip.startedAt * 1000 }];
    })
    .slice(0, limit);
}

export function stripItems(latest: ClipTile | null, tiles: readonly CameraTile[]): StripItem[] {
  const cameras = tiles.map((tile): StripItem => ({ kind: 'camera', tile }));
  return latest ? [{ kind: 'clip', clip: latest }, ...cameras] : cameras;
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
