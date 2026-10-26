import { describe, expect, test } from 'bun:test';
import { activityToday } from '@/features/security/model/camera-activity';
import {
  gridColumnsFor,
  onlineCount,
  rowsOf,
  securityTiles,
  sparseGrid,
  tileLabel,
} from '@/features/security/model/camera-tiles';
import { cameraNameOf, happenedItems, happenedStatus } from '@/features/security/model/happened';
import { feedWhen, tileWhen } from '@/features/security/model/moment';
import { activeGuests, moreKeys, moreRows } from '@/features/security/model/more-rows';
import { placeMeta, placeScope, placeTitle } from '@/features/security/model/places';
import {
  alertEpisode,
  securityStatus,
  statusStats,
  statusWords,
  visitsToday,
} from '@/features/security/model/security-status';
import { starters } from '@/features/security/model/starters';
import { visitMeta } from '@/features/security/model/visits';
import {
  NOW,
  SECONDS,
  environment,
  episode,
  format,
  guest,
  maintenanceWindow,
  t,
} from './security-fixtures';

const MINUTE = 60_000;

const status = (overrides: Partial<Parameters<typeof securityStatus>[0]> = {}) =>
  securityStatus({
    environments: [environment()],
    episodes: [],
    guests: [],
    canReview: true,
    now: NOW,
    ...overrides,
  });

describe('the Seguridad status', () => {
  test('a calm home says its mode and what it means, with the three stats', () => {
    const calm = status({ guests: [guest()], episodes: [episode({ notified: true })] });
    expect(calm.tone).toBe('calm');
    expect(calm.aura).toBe('calm');
    expect(calm.presence).toBe('idle');
    expect(statusWords(calm, t)).toEqual({
      sentence: 'En casa',
      meta: 'Te aviso solo de desconocidos',
    });
    expect(statusStats(calm.counts, t, 'phone')).toEqual([
      { value: '0', label: 'en curso' },
      { value: '1', label: 'por revisar', tone: 'attn' },
      { icon: 'door', value: '1', label: 'visita hoy' },
    ]);
  });

  test('on watch the presence draws its arc and the aura turns to duty', () => {
    const night = status({
      environments: [environment({ mode: 'night', effectiveMode: 'night' })],
    });
    expect(night.presence).toBe('watch');
    expect(night.aura).toBe('duty');
    expect(statusWords(night, t).sentence).toBe('Noche');
  });

  test('something in progress is attention, a raised danger is the alert', () => {
    const active = episode({ id: 2, state: 'active', danger: 'medium', notified: true });
    expect(status({ episodes: [active] }).tone).toBe('attention');
    expect(status({ episodes: [active] }).aura).toBe('attn');
    const raised = episode({ id: 3, state: 'active', danger: 'high', notified: true });
    const alert = status({ episodes: [active, raised] });
    expect(alert.tone).toBe('alert');
    expect(alert.presence).toBe('alert');
    expect(alert.alert?.id).toBe(3);
    expect(statusWords(alert, t)).toEqual({
      sentence: 'Persona desconocida',
      meta: 'Patio trasero · ahora',
    });
  });

  test('the latest raised episode is the alert, and a quiet one never is', () => {
    const older = episode({
      id: 4,
      state: 'active',
      danger: 'critical',
      notified: true,
      lastSeen: 10,
    });
    const newer = episode({ id: 5, state: 'active', danger: 'high', notified: true, lastSeen: 20 });
    expect(alertEpisode([older, newer])?.id).toBe(5);
    expect(alertEpisode([episode({ state: 'active', danger: 'critical' })])).toBeNull();
  });

  test('places in different modes say so instead of a mode', () => {
    const mixed = status({
      environments: [environment(), environment({ id: 2, mode: 'armed', effectiveMode: 'armed' })],
    });
    expect(mixed.mode).toBeNull();
    expect(statusWords(mixed, t).sentence).toBe('Modos distintos');
  });

  test('without review rights the review stat is gone, and the band keeps one stat at 1280', () => {
    const counts = status({ canReview: false, guests: [guest(), guest({ id: 2 })] }).counts;
    expect(counts.review).toBeNull();
    expect(statusStats(counts, t, 'phone').map((stat) => stat.label)).toEqual([
      'en curso',
      'visitas hoy',
    ]);
    const full = status({ episodes: [episode({ notified: true })] }).counts;
    expect(statusStats(full, t, 'band').map((stat) => stat.label)).toEqual(['por revisar']);
    expect(statusStats(full, t, 'band-wide').map((stat) => stat.label)).toEqual([
      'por revisar',
      'en curso',
      'visitas hoy',
    ]);
  });

  test('a visit counts today while it is still valid and starts before midnight', () => {
    const tomorrow = new Date(NOW).setHours(24, 30, 0, 0) / 1000;
    expect(
      visitsToday(
        [
          guest(),
          guest({ id: 2, validUntil: SECONDS - 60 }),
          guest({ id: 3, validFrom: tomorrow, validUntil: tomorrow + 3600 }),
        ],
        NOW
      )
    ).toBe(1);
  });
});

describe('camera tiles', () => {
  const tiles = securityTiles([
    { id: '7', name: 'Dormitorio', status: 'online', masked: true, lastEventAt: null },
    { id: '1', name: 'Cocina', status: 'online', masked: false, lastEventAt: NOW - 15 * MINUTE },
    { id: '5', name: 'Garaje', status: 'disabled', masked: false, lastEventAt: null },
    { id: '6', name: 'Jardín', status: 'offline', masked: false, lastEventAt: null },
    { id: '3', name: 'Patio trasero', status: 'online', masked: false, lastEventAt: null },
  ]);

  test('live cameras come first and the rest keep their order', () => {
    expect(tiles.map((tile) => `${tile.name}:${tile.state}`)).toEqual([
      'Cocina:live',
      'Patio trasero:live',
      'Dormitorio:private',
      'Garaje:off',
      'Jardín:offline',
    ]);
    expect(onlineCount(tiles)).toBe(3);
  });

  test('each tile says its state in words, a live one its last activity', () => {
    expect(tiles.map((tile) => tileLabel(tile, NOW, format))).toEqual([
      '14:45',
      'sin novedad',
      'Privada',
      'Apagada',
      'Sin conexión',
    ]);
    const yesterday = { id: '9', name: 'Sala', state: 'live' as const, at: NOW - 86_400_000 };
    expect(tileLabel(yesterday, NOW, format)).toBe('ayer');
  });

  test('the grid adds columns as its width grows, and rows pad with empty slots', () => {
    expect(gridColumnsFor(328)).toBe(2);
    expect(gridColumnsFor(620)).toBe(3);
    expect(gridColumnsFor(870)).toBe(3);
    expect(gridColumnsFor(1500)).toBe(4);
    expect(rowsOf([1, 2, 3], 2)).toEqual([
      [1, 2],
      [3, null],
    ]);
    expect(sparseGrid(0)).toBe(false);
    expect(sparseGrid(2)).toBe(true);
    expect(sparseGrid(3)).toBe(false);
  });
});

describe('what happened', () => {
  const names = cameraNameOf(new Map([['3', 'Patio']]));

  test('pending reviews come first, then the newest', () => {
    const items = happenedItems(
      [
        episode({ id: 1, lastSeen: SECONDS - 60 }),
        episode({ id: 2, notified: true, lastSeen: SECONDS - 7200 }),
        episode({ id: 3, kind: 'camera', status: 'covered', lastSeen: SECONDS - 600 }),
      ],
      { now: NOW, format, canReview: true, cameraName: names }
    );
    expect(items.map((item) => [item.key, item.icon, item.tone, item.review])).toEqual([
      ['person-2', 'alert', 'attn', true],
      ['person-1', 'user', 'default', false],
      ['camera-3', 'eyeoff', 'attn', false],
    ]);
    expect(items.map((item) => item.where)).toEqual(['Patio', 'Patio', 'Patio']);
    expect(items.map((item) => item.when)).toEqual(['13:00', 'hace 1 min', 'hace 10 min']);
  });

  test('without review rights nothing is marked to review', () => {
    const items = happenedItems([episode({ notified: true })], {
      now: NOW,
      format,
      canReview: false,
      cameraName: cameraNameOf(new Map()),
    });
    expect(items[0]?.review).toBe(false);
    expect(items[0]?.where).toBe('Patio trasero');
  });

  test('rows on screen win, an answered empty feed is empty, and nothing loaded waits', () => {
    expect(happenedStatus(2, 'failed')).toBe('ready');
    expect(happenedStatus(0, 'ready')).toBe('empty');
    expect(happenedStatus(0, 'failed')).toBe('failed');
    expect(happenedStatus(0, 'loading')).toBe('loading');
  });
});

describe('moments', () => {
  test('a feed row says how long ago within the hour, then the clock and the day', () => {
    expect(feedWhen(NOW - 20_000, NOW, format)).toBe('ahora');
    expect(feedWhen(NOW - 5 * MINUTE, NOW, format)).toBe('hace 5 min');
    expect(feedWhen(NOW - 120 * MINUTE, NOW, format)).toBe('13:00');
    expect(feedWhen(NOW - 86_400_000, NOW, format)).toBe('ayer 15:00');
    expect(feedWhen(NOW - 3 * 86_400_000, NOW, format)).toBe('lun 15:00');
  });

  test('a tile says the time today, ayer, then the day', () => {
    expect(tileWhen(NOW - MINUTE, NOW, format)).toBe('14:59');
    expect(tileWhen(NOW - 86_400_000, NOW, format)).toBe('ayer');
    expect(tileWhen(NOW - 4 * 86_400_000, NOW, format)).toBe('lun');
  });
});

describe('the Más rows', () => {
  const facts = {
    guests: [guest()],
    environments: [environment(), environment({ id: 2, name: 'Restaurante Centro' })],
    windows: [maintenanceWindow()],
    cameraName: (id: number) => (id === 3 ? 'Patio trasero' : ''),
    now: NOW,
    time: format.time,
    t,
  };

  test('maintenance needs its access and people seen are the owner’s', () => {
    expect(moreKeys({ maintenance: false, people: false })).toEqual(['visits', 'places']);
    expect(moreKeys({ maintenance: true, people: true })).toEqual([
      'visits',
      'places',
      'maintenance',
      'people',
    ]);
  });

  test('every row carries what it holds now', () => {
    expect(moreRows(moreKeys({ maintenance: true, people: true }), facts)).toEqual([
      {
        key: 'visits',
        icon: 'door',
        title: 'Visitas esperadas',
        meta: 'Técnico de internet, hasta 18:00',
      },
      {
        key: 'places',
        icon: 'sliders',
        title: 'Lugares y modos',
        meta: 'Casa, Restaurante Centro',
      },
      {
        key: 'maintenance',
        icon: 'sliders',
        title: 'Mantenimiento',
        meta: 'Patio trasero, hasta 15:15',
      },
      {
        key: 'people',
        icon: 'users',
        title: 'Personas vistas',
        meta: 'Quién pasó por tus cámaras',
      },
    ]);
  });

  test('no visit, several visits and no maintenance say so', () => {
    const quiet = moreRows(['visits', 'maintenance'], { ...facts, guests: [], windows: [] });
    expect(quiet.map((row) => row.meta)).toEqual(['Nadie por ahora', 'Nada en curso']);
    const busy = moreRows(['visits'], { ...facts, guests: [guest(), guest({ id: 2 })] });
    expect(busy[0]?.meta).toBe('2 visitas activas');
    expect(activeGuests([guest({ validUntil: SECONDS - 1 })], NOW)).toEqual([]);
  });
});

describe('places', () => {
  const home = environment();
  const shop = environment({
    id: 2,
    name: 'Restaurante Centro',
    isDefault: false,
    kind: 'restaurant',
  });

  test('one place is always the scope; with several the default comes first and all can be picked', () => {
    expect(placeScope([home], 'all')).toEqual({
      place: home,
      environments: [home],
      several: false,
    });
    expect(placeScope([shop, home], null).place).toBe(home);
    expect(placeScope([home, shop], 2).place).toBe(shop);
    const all = placeScope([home, shop], 'all');
    expect(all.place).toBeNull();
    expect(placeTitle(all, t)).toBe('Todos los lugares');
    expect(placeTitle(placeScope([home, shop], 2), t)).toBe('Restaurante Centro');
    expect(placeScope([], null)).toEqual({ place: null, environments: [], several: false });
  });

  test('a place row says its mode and its cameras', () => {
    expect(placeMeta(home, 0, t)).toBe('En casa · sin cámaras');
    expect(placeMeta(home, 1, t)).toBe('En casa · 1 cámara');
    expect(placeMeta(environment({ effectiveMode: 'away' }), 6, t)).toBe('Fuera · 6 cámaras');
  });
});

describe('visits and activity', () => {
  test('a visit says until when, today or another day, or that it expired', () => {
    expect(visitMeta(guest(), NOW, format)).toBe('Hoy hasta 18:00');
    expect(visitMeta(guest({ validUntil: SECONDS + 86_400 }), NOW, format)).toBe('lun hasta 15:00');
    expect(visitMeta(guest({ validUntil: SECONDS - 60 }), NOW, format)).toBe('Vencida');
  });

  test('activity per camera counts today and names the last thing seen', () => {
    const rows = activityToday(
      [
        { id: '3', name: 'Puerta principal', state: 'live', at: null },
        { id: '4', name: 'Garaje', state: 'off', at: null },
        { id: '5', name: 'Patio', state: 'live', at: null },
      ],
      {
        events: [
          { cameraId: 3, at: NOW - 30 * MINUTE, label: 'person' },
          { cameraId: 3, at: NOW - 10 * MINUTE, label: 'car' },
          { cameraId: 3, at: NOW - 86_400_000, label: 'person' },
        ],
        now: NOW,
        t,
        time: format.time,
        what: (label) => (label === 'car' ? 'Vehículo' : 'Persona'),
      }
    );
    expect(rows).toEqual([
      { id: '3', name: 'Puerta principal', meta: 'Vehículo · 14:50', count: 2 },
      { id: '4', name: 'Garaje', meta: 'Apagada', count: 0 },
      { id: '5', name: 'Patio', meta: 'Sin novedad', count: 0 },
    ]);
  });
});

describe('starters', () => {
  test('few cameras explain what Argus does, and an answered empty feed suggests what to try', () => {
    expect(starters({ cameras: 0, feed: 'ready', episodes: 0 })).toEqual({
      promise: true,
      suggest: true,
    });
    expect(starters({ cameras: 3, feed: 'ready', episodes: 2 })).toEqual({
      promise: false,
      suggest: false,
    });
    expect(starters({ cameras: 2, feed: 'loading', episodes: 0 })).toEqual({
      promise: true,
      suggest: false,
    });
  });
});
