import { describe, expect, test } from 'bun:test';
import { navStatusRows, type NavStatusCopy } from '@/features/navigation/model/nav-status-rows';

const copy: NavStatusCopy = {
  mode: 'Modo',
  modeName: (mode) => `«${mode}»`,
  cameras: ({ online, total }) => `${online} de ${total}`,
  camerasActive: 'cámaras activas',
};

describe('navStatusRows', () => {
  test('the mode and the cameras show when both are known', () => {
    expect(navStatusRows({ mode: 'home', cameras: { online: 5, total: 6 }, copy })).toEqual([
      { icon: 'home', before: 'Modo', strong: '«home»' },
      { icon: 'cam', strong: '5 de 6', after: 'cámaras activas' },
    ]);
  });

  test('a row whose data is unknown or empty is absent, never invented', () => {
    expect(navStatusRows({ mode: null, cameras: null, copy })).toEqual([]);
    expect(navStatusRows({ mode: null, cameras: { online: 0, total: 0 }, copy })).toEqual([]);
    expect(navStatusRows({ mode: 'night', cameras: null, copy }).map((row) => row.icon)).toEqual([
      'moon',
    ]);
  });
});
