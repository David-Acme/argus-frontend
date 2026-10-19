import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(import.meta.dir, '../../../../src', path), 'utf8');

const DETAIL = read('features/cameras/screens/camera-detail-screen.tsx');
const LIVE_PANEL = read('features/cameras/components/camera-live-panel.tsx');
const STAGE = read('features/cameras/components/camera-live-stage.tsx');
const THREAD_ROW = read('features/home/components/notification-thread-row.tsx');
const EPISODE_CARD = read('features/security/components/episode-card.tsx');
const APP_LAYOUT = read('app/(app)/_layout.tsx');

describe('the camera detail carries the camera sight surfaces', () => {
  test('the aim and maintenance panels render in every window class', () => {
    expect(DETAIL.match(/\{aimPanel\}/g)).toHaveLength(3);
    expect(DETAIL.match(/\{maintenancePanel\}/g)).toHaveLength(3);
  });

  test('the aim settings are the Owner and Resident ones, maintenance follows the guard access', () => {
    expect(DETAIL).toContain('const aimPanel = canUpdate && aimable ? <CameraAimPanel controls={aimControls} /> : null;');
    expect(DETAIL).toContain('const maintenancePanel = guardAccess.maintenance ?');
  });

  test('moving follows camera.aim, saving and setting positions stay with the Owner and Resident', () => {
    expect(DETAIL).toContain('const ptzAllowed = cameraActions.aim && aimable && camera?.isEnabled === true;');
    expect(DETAIL).toContain('onSave: cameraActions.managePresets ?');
    expect(DETAIL).toContain('onSetHome: cameraActions.managePresets ?');
    expect(DETAIL).toContain("action: 'go_home'");
    expect(DETAIL).toContain("action: 'set_home'");
  });

  test('the viewer lease is held only while the controls are open on a live picture', () => {
    expect(DETAIL).toContain('useViewerLease(id, ptzAllowed && stage.showPad && stage.live, aimControls.apply);');
  });

  test('the indicator rides the stage in the panel and in fullscreen', () => {
    expect(DETAIL.match(/badge=\{badge\}/g)).toHaveLength(2);
    expect(LIVE_PANEL).toContain('badge={badge}');
    expect(STAGE).toContain('{controls && live && badge ? (');
  });

  test('the home preset is marked and can be set from its row', () => {
    expect(LIVE_PANEL).toContain('home={preset.id === presets.homePreset}');
    expect(LIVE_PANEL).toContain("icon=\"crosshair\"");
  });
});

describe('notices and incidents', () => {
  test('a sight notice renders its own title and answers in the thread row', () => {
    expect(THREAD_ROW).toContain('const sight = useSightNotice(thread.kind, latest.data);');
    expect(THREAD_ROW).toContain('<SightNoticeActions notice={sight.notice}');
  });

  test('a tamper incident shows its evidence and the claim', () => {
    expect(EPISODE_CARD).toContain('<TamperEvidenceView target={{ cameraId: episode.cameraId, onsetAt: episode.firstSeen }} enabled={evidence} />');
    expect(EPISODE_CARD).toContain("t('screens.security.tamper.claim')");
  });

  test('evidence is kept as soon as a tamper notice lands, for every signed-in screen', () => {
    expect(APP_LAYOUT).toContain('useTamperEvidenceKeeper();');
  });
});
