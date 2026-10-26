import type { TranslationKey } from '@/core/types';
import { layout } from '@/shared/theme/tokens';
import { tileWhen, type MomentFormat } from './moment';

export type TileState = 'live' | 'private' | 'off' | 'offline';

export type TileSource = {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'disabled';
  masked: boolean;
  lastEventAt: number | null;
};

export type SecurityTile = { id: string; name: string; state: TileState; at: number | null };

export const PHONE_TILES = 4;

const RESTING_WORDS: Readonly<Record<Exclude<TileState, 'live'>, TranslationKey>> = {
  private: 'screens.security.camera-grid.private',
  off: 'screens.security.camera-grid.off',
  offline: 'screens.security.camera-grid.offline',
};

function stateOf(source: TileSource): TileState {
  if (source.status === 'disabled') return 'off';
  if (source.masked) return 'private';
  return source.status === 'online' ? 'live' : 'offline';
}

export function securityTiles(sources: readonly TileSource[]): SecurityTile[] {
  const tiles = sources.map((source) => ({
    id: source.id,
    name: source.name,
    state: stateOf(source),
    at: source.lastEventAt,
  }));
  return [
    ...tiles.filter((tile) => tile.state === 'live'),
    ...tiles.filter((tile) => tile.state !== 'live'),
  ];
}

export function tileLabel(tile: SecurityTile, now: number, format: MomentFormat): string {
  if (tile.state !== 'live') return format.t(RESTING_WORDS[tile.state]);
  if (tile.at !== null) return tileWhen(tile.at, now, format);
  return format.t('screens.security.camera-grid.quiet');
}

export function onlineCount(tiles: readonly SecurityTile[]): number {
  return tiles.filter((tile) => tile.state === 'live' || tile.state === 'private').length;
}

export function maxColumnsFor(width: number): number {
  if (width >= layout.mediaGridFour) return 4;
  return width >= layout.mediaGridThree ? 3 : 2;
}

type Shape = { columns: number; empty: number; tall: boolean };

function shapeOf(count: number, columns: number): Shape {
  const rows = Math.ceil(count / columns);
  return { columns, empty: rows * columns - count, tall: rows > columns };
}

function better(left: Shape, right: Shape): Shape {
  if (left.tall !== right.tall) return left.tall ? right : left;
  if (left.empty !== right.empty) return left.empty < right.empty ? left : right;
  return left.columns <= right.columns ? left : right;
}

export function gridColumnsFor(count: number, width: number): number {
  const most = Math.min(maxColumnsFor(width), Math.max(1, count));
  const shapes = Array.from({ length: Math.max(1, most - 1) }, (_, index) =>
    shapeOf(count, Math.min(most, index + 2))
  );
  return shapes.reduce(better).columns;
}

export function rowsOf<T>(items: readonly T[], columns: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let start = 0; start < items.length; start += columns) {
    const row: (T | null)[] = items.slice(start, start + columns);
    while (row.length < columns) row.push(null);
    rows.push(row);
  }
  return rows;
}

export const SPARSE_CAMERAS = 2;

export function sparseGrid(total: number): boolean {
  return total > 0 && total <= SPARSE_CAMERAS;
}
