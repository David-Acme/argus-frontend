import { describe, expect, test } from 'bun:test';
import { getDashboardSectionLayout } from '../src/shared/libs/dashboard-section-layout';

describe('getDashboardSectionLayout', () => {
  test('lets stacked compact sections follow their content while reserving the cameras footprint', () => {
    expect(getDashboardSectionLayout(393, 480)).toEqual({
      fill: false,
      minHeight: undefined,
      cameraMinHeight: 184,
    });
  });

  test('uses a denser baseline and equal-height fill on a short landscape phone', () => {
    expect(getDashboardSectionLayout(800, 393)).toEqual({
      fill: true,
      minHeight: 164,
      cameraMinHeight: 184,
    });
  });

  test('keeps roomy equal-height panels on a tall tablet or desktop window', () => {
    expect(getDashboardSectionLayout(1024, 768)).toEqual({
      fill: true,
      minHeight: 248,
      cameraMinHeight: 184,
    });
  });
});
