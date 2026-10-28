import { describe, expect, test } from 'bun:test';
import {
  allSheetLong,
  moreModulesThanGrid,
  SHEET_GRID,
} from '@/features/navigation/model/nav-model';

describe('the «Todo» sheet shape', () => {
  test('it opens at the half snap point, and fills the screen when expanded or searching', () => {
    expect(allSheetLong({ searching: false, full: false })).toBe(true);
    expect(allSheetLong({ searching: false, full: true })).toBe('fill');
    expect(allSheetLong({ searching: true, full: false })).toBe('fill');
  });

  test('«Ver los N módulos» appears only when the grid cannot show them all', () => {
    expect(moreModulesThanGrid(2)).toBe(false);
    expect(moreModulesThanGrid(SHEET_GRID)).toBe(false);
    expect(moreModulesThanGrid(SHEET_GRID + 1)).toBe(true);
  });
});
