import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = readFileSync(
  join(import.meta.dir, '../../../../src/features/cameras/screens/camera-detail-screen.tsx'),
  'utf8'
);

type WindowClass = 'expanded' | 'medium' | 'phone';

function layoutBranches(): Record<WindowClass, string> {
  const expandedAt = SOURCE.indexOf('{isExpanded ? (');
  const mediumAt = SOURCE.indexOf(') : isMedium ? (', expandedAt);
  const phoneAt = SOURCE.indexOf(') : (', mediumAt);
  const endAt = SOURCE.indexOf(')}', phoneAt);
  expect(expandedAt).toBeGreaterThan(-1);
  expect(mediumAt).toBeGreaterThan(expandedAt);
  expect(phoneAt).toBeGreaterThan(mediumAt);
  expect(endAt).toBeGreaterThan(phoneAt);
  return {
    expanded: SOURCE.slice(expandedAt, mediumAt),
    medium: SOURCE.slice(mediumAt, phoneAt),
    phone: SOURCE.slice(phoneAt, endAt),
  };
}

describe('the camera detail layout', () => {
  const branches = layoutBranches();

  test('the clips panel renders in all three window classes, after the player', () => {
    for (const windowClass of ['expanded', 'medium', 'phone'] as const) {
      const branch = branches[windowClass];
      const live = branch.indexOf('{live}');
      const player = branch.indexOf('{player}');
      const clips = branch.indexOf('{clipsPanel}');
      expect(live).toBeGreaterThan(-1);
      expect(player).toBeGreaterThan(live);
      expect(clips).toBeGreaterThan(player);
    }
    expect(SOURCE.match(/\{clipsPanel\}/g)).toHaveLength(3);
  });

  test('the clips surface is the Owner and Guard one, gated by clips.view', () => {
    expect(SOURCE).toContain('const clipsState = useCameraClips(id, clipAccess.view);');
    expect(SOURCE).toContain('playable={clipAccess.view}');
  });
});
