import { describe, expect, test } from 'bun:test';
import { MOSAIC_COLUMNS, MOSAIC_ROWS } from '@/shared/constants';
import { cameraActivity } from '@/features/home/model/camera-activity';

const NOW = new Date(2026, 9, 7, 15, 30).getTime();

const at = (daysAgo: number, hour: number, minute = 0) => ({
  at: new Date(2026, 9, 7 - daysAgo, hour, minute).getTime(),
});

const zeros = () => Array.from({ length: MOSAIC_ROWS }, () => Array.from({ length: MOSAIC_COLUMNS }, () => 0));

describe('the camera activity the home shows', () => {
  test('an empty list counts nothing and leaves the mosaic dark', () => {
    expect(cameraActivity([], NOW)).toEqual({ recent: 0, today: 0, levels: zeros() });
  });

  test('recent counts the list, today counts from midnight, and both read the same detections', () => {
    const detections = [at(0, 15, 12), at(0, 9, 30), at(1, 20, 0)];
    const activity = cameraActivity(detections, NOW);
    expect(activity.recent).toBe(3);
    expect(activity.today).toBe(2);
  });

  test('the mosaic places each detection on its day and 4-hour band, scaled to the peak', () => {
    const activity = cameraActivity([at(0, 15, 12), at(0, 9, 30), at(1, 20, 0)], NOW);
    const levels = zeros();
    levels[3]![MOSAIC_COLUMNS - 1] = 3;
    levels[2]![MOSAIC_COLUMNS - 1] = 3;
    levels[5]![MOSAIC_COLUMNS - 2] = 3;
    expect(activity.levels).toEqual(levels);
  });

  test('a detection older than the mosaic window still counts as recent and stays out of the chart', () => {
    const activity = cameraActivity([at(20, 12, 0)], NOW);
    expect(activity.recent).toBe(1);
    expect(activity.today).toBe(0);
    expect(activity.levels).toEqual(zeros());
  });
});
