import { describe, expect, test } from 'bun:test';
import { parseVoiceAction } from '@/features/voice/services/voice/voice-frames';
import { callCameraEvent, detectedClasses, resolveCameraId, routeForScreen } from '@/features/voice/model/voice-actions';

const cameras = [
  { id: '1', name: 'Entrada principal' },
  { id: '2', name: 'Patio' },
];

describe('resolveCameraId', () => {
  test('matches a spoken name regardless of accents, case or partial words', () => {
    expect(resolveCameraId({ requested: 'PATIO', cameras, lastEventCameraId: null })).toBe('2');
    expect(resolveCameraId({ requested: 'la entrada', cameras, lastEventCameraId: null })).toBe('1');
    expect(resolveCameraId({ requested: 'cocina', cameras, lastEventCameraId: null })).toBeNull();
    expect(resolveCameraId({ requested: 'entrada', cameras, lastEventCameraId: null })).toBe('1');
    expect(resolveCameraId({ requested: 'Éntrada Principal', cameras, lastEventCameraId: null })).toBe('1');
  });

  test('an empty request falls back to the camera of the last event, then to the only camera', () => {
    expect(resolveCameraId({ requested: '', cameras, lastEventCameraId: '2' })).toBe('2');
    expect(resolveCameraId({ requested: '', cameras, lastEventCameraId: '9' })).toBeNull();
    expect(resolveCameraId({ requested: '', cameras: cameras.slice(0, 1), lastEventCameraId: null })).toBe('1');
  });
});

describe('routeForScreen', () => {
  test('people follows the directory right and settings stays with the owner', () => {
    expect(routeForScreen('people', 'owner')).toBe('/users');
    expect(routeForScreen('people', 'guard')).toBe('/people');
    expect(routeForScreen('people', 'resident')).toBeNull();
    expect(routeForScreen('settings', 'resident')).toBeNull();
    expect(routeForScreen('agenda', 'guest')).toBe('/agenda');
    expect(routeForScreen('nowhere', 'owner')).toBeNull();
  });
});

describe('voice actions on the wire', () => {
  test('a known action parses with its arguments and anything else is dropped', () => {
    expect(parseVoiceAction({ id: 3, name: 'app.open', arguments: { screen: 'agenda' } })).toEqual({
      id: '3',
      name: 'app.open',
      arguments: { screen: 'agenda' },
    });
    expect(parseVoiceAction({ id: 3, name: 'app.delete_everything', arguments: {} })).toBeNull();
    expect(parseVoiceAction({ name: 'app.open' })).toBeNull();
    expect(parseVoiceAction({ id: 4, name: 'app.show_camera', arguments: 'x' })?.arguments).toEqual({});
  });

  test('detected classes are read once each from the notification data', () => {
    expect(detectedClasses({ objects: [{ class: 'person' }, { class: 'dog' }, { class: 'person' }, 3] })).toEqual([
      'person',
      'dog',
    ]);
    expect(detectedClasses({})).toEqual([]);
  });
});

describe('callCameraEvent', () => {
  test('a detection names its camera and carries no guard copy', () => {
    expect(
      callCameraEvent({ type: 'camera', body: 'Persona', data: { cameraName: 'Patio', cameraId: 2 }, cameras }),
    ).toEqual({ cameraId: '2', camera: 'Patio', guardCopy: null });
  });

  test('a guard episode without a camera name resolves it by id and keeps its spoken copy', () => {
    expect(
      callCameraEvent({
        type: 'camera',
        body: ' De noche, en la entrada, desde hace 18 s. ',
        data: { cameraId: 1, kind: 'guard_episode' },
        cameras,
      }),
    ).toEqual({ cameraId: '1', camera: 'Entrada principal', guardCopy: 'De noche, en la entrada, desde hace 18 s.' });
  });

  test('other notifications and unknown cameras are not camera events', () => {
    expect(callCameraEvent({ type: 'reminder', body: '', data: { cameraName: 'Patio' }, cameras })).toBeNull();
    expect(callCameraEvent({ type: 'camera', body: '', data: { cameraId: 9 }, cameras })).toBeNull();
    expect(callCameraEvent({ type: 'camera', body: '', data: null, cameras })).toBeNull();
  });
});
