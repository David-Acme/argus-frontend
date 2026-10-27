import { describe, expect, test } from 'bun:test';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn } from '@/core/types';
import { rowMoment, tileMoment, type MomentFormat } from '@/features/home/model/camera-moments';
import {
  cameraTiles,
  gridColumns,
  gridLimit,
  gridRows,
  tileDetail,
  type CameraTileSource,
} from '@/features/home/model/camera-tiles';

const t: TranslateFn = (key, ...rest) => translate(localeDictionaries.es, key, ...rest);

const pad = (value: number) => String(value).padStart(2, '0');

const format: MomentFormat = {
  t,
  time: (value) => `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  day: (value) => ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][value.getDay()] ?? '',
};

const NOW = new Date(2026, 9, 21, 15, 0).getTime();

const at = (day: number, hour: number, minute: number) =>
  new Date(2026, 9, day, hour, minute).getTime();

function source(overrides: Partial<CameraTileSource>): CameraTileSource {
  return {
    id: '1',
    name: 'Cocina',
    status: 'online',
    masked: false,
    lastEventAt: null,
    ...overrides,
  };
}

describe('Inicio camera tiles', () => {
  test('live cameras come first and the rest keep their order after them', () => {
    const tiles = cameraTiles(
      [
        source({ id: '1', name: 'Garaje', status: 'disabled' }),
        source({ id: '2', name: 'Cocina' }),
        source({ id: '3', name: 'Dormitorio', masked: true }),
        source({ id: '4', name: 'Patio', status: 'offline' }),
        source({ id: '5', name: 'Sala' }),
      ],
      4
    );
    expect(tiles.map((tile) => [tile.name, tile.state])).toEqual([
      ['Cocina', 'live'],
      ['Sala', 'live'],
      ['Garaje', 'off'],
      ['Dormitorio', 'private'],
    ]);
  });

  test('a turned-off camera reads as off even when its mask is on', () => {
    expect(cameraTiles([source({ status: 'disabled', masked: true })], 1)[0]?.state).toBe('off');
  });

  test('the desktop grid shows four cameras, six when the column is wide', () => {
    expect(gridLimit(false)).toBe(4);
    expect(gridLimit(true)).toBe(6);
  });

  test('the grid keeps two columns and leaves the last slot empty on an odd count', () => {
    expect(gridColumns(1)).toBe(1);
    expect(gridColumns(5)).toBe(2);
    expect(gridRows(['a', 'b', 'c'], 2)).toEqual([
      ['a', 'b'],
      ['c', null],
    ]);
    expect(gridRows([], 2)).toEqual([]);
  });

  test('a tile says its last activity, or why it shows no picture', () => {
    const input = { now: NOW, format };
    const [live] = cameraTiles([source({ lastEventAt: at(21, 14, 47) })], 1);
    const [quiet] = cameraTiles([source({})], 1);
    const [privacy] = cameraTiles([source({ masked: true })], 1);
    const [offline] = cameraTiles([source({ status: 'offline' })], 1);
    expect(live && tileDetail(live, input)).toBe('14:47');
    expect(quiet && tileDetail(quiet, input)).toBe('sin novedad');
    expect(privacy && tileDetail(privacy, input)).toBe('Privada');
    expect(offline && tileDetail(offline, input)).toBe('Sin conexión');
  });
});

describe('Inicio camera moments', () => {
  test('a tile shows the time today, then «ayer», then the weekday', () => {
    expect(tileMoment(at(21, 9, 5), NOW, format)).toBe('09:05');
    expect(tileMoment(at(20, 21, 53), NOW, format)).toBe('ayer');
    expect(tileMoment(at(18, 10, 0), NOW, format)).toBe('dom');
  });

  test('a row keeps the time beside «ayer» and the weekday', () => {
    expect(rowMoment(at(21, 14, 45), NOW, format)).toBe('14:45');
    expect(rowMoment(at(20, 21, 53), NOW, format)).toBe('ayer 21:53');
    expect(rowMoment(at(18, 10, 0), NOW, format)).toBe('dom 10:00');
  });

  test('a moment from a clock ahead of ours still reads as today', () => {
    expect(rowMoment(at(22, 1, 0), NOW, format)).toBe('01:00');
  });
});
