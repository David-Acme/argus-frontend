import {
  DASHBOARD_CAMERA_MIN_HEIGHT,
  DASHBOARD_SECTION_MIN_HEIGHT,
  DASHBOARD_SECTION_MIN_HEIGHT_SHORT,
} from '../constants/dashboard.constant';
import { WINDOW_MEDIUM_MIN, WINDOW_TALL_MIN } from '../constants/layout.constant';

export type DashboardSectionLayout = {
  cameraMinHeight: number;
  fill: boolean;
  minHeight?: number;
};

export function getDashboardSectionLayout(width: number, height: number): DashboardSectionLayout {
  const fill = width >= WINDOW_MEDIUM_MIN;
  const shortWide = fill && height < WINDOW_TALL_MIN;

  return {
    cameraMinHeight: DASHBOARD_CAMERA_MIN_HEIGHT,
    fill,
    minHeight: fill
      ? shortWide
        ? DASHBOARD_SECTION_MIN_HEIGHT_SHORT
        : DASHBOARD_SECTION_MIN_HEIGHT
      : undefined,
  };
}
