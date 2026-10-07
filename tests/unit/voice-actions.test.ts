import { describe, expect, test } from 'bun:test';
import { parseVoiceAction } from '@/features/voice/services/voice/voice-frames';
import {
  callCameraEvent,
  cameraViewOf,
  detectedClasses,
  resolveCameraId,
  routeForScreen,
} from '@/features/voice/model/voice-actions';
import { CAPABILITY } from '@/shared/constants';
import { accessView } from '@/shared/libs/capabilities';
import { accessFor, noContextView, viewFor } from './support/access-fixtures';

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
    expect(routeForScreen('people', viewFor('owner'))).toBe('/users');
    expect(routeForScreen('people', viewFor('guard'))).toBe('/people');
    expect(routeForScreen('people', viewFor('resident'))).toBeNull();
    expect(routeForScreen('settings', viewFor('resident'))).toBeNull();
    expect(routeForScreen('settings', viewFor('owner'))).toBe('/settings');
    expect(routeForScreen('agenda', viewFor('resident'))).toBe('/agenda');
    expect(routeForScreen('nowhere', viewFor('owner'))).toBeNull();
  });

  test('a screen of a module that is off or that the role cannot read is not opened', () => {
    expect(routeForScreen('agenda', viewFor('guest'))).toBeNull();
    expect(routeForScreen('cameras', viewFor('owner', { modules: ['productivity'] }))).toBeNull();
    expect(routeForScreen('security', viewFor('guard', { modules: [] }))).toBeNull();
    expect(routeForScreen('home', viewFor('guard', { modules: [] }))).toBe('/');
  });
});

describe('what the assistant can point to', () => {
  test('the modules screen is the owner\'s, with the module it was asked about when it is a real id', () => {
    expect(routeForScreen('modules', viewFor('owner'))).toBe('/settings/modules');
    expect(routeForScreen('modules', viewFor('owner'), 'surveillance')).toBe('/settings/modules?module=surveillance');
    expect(routeForScreen('modules', viewFor('owner'), '../x?y=1')).toBe('/settings/modules');
    expect(routeForScreen('modules', viewFor('resident'), 'surveillance')).toBeNull();
    expect(routeForScreen('home', viewFor('owner'), 'surveillance')).toBe('/');
  });

  test('the notifications open the home screen with its panel asked for once, with no module in the way', () => {
    expect(routeForScreen('notifications', viewFor('owner'))).toBe('/?panel=notifications');
    expect(routeForScreen('notifications', viewFor('owner'), 'surveillance')).toBe('/?panel=notifications');
    expect(routeForScreen('notifications', viewFor('owner'), '')).toBe('/?panel=notifications');
    expect(routeForScreen('home', viewFor('owner'))).toBe('/');
  });

  test('every role gets the notifications, with every optional module off', () => {
    for (const role of ['owner', 'resident', 'guard', 'guest'] as const) {
      expect(routeForScreen('notifications', viewFor(role))).toBe('/?panel=notifications');
      expect(routeForScreen('notifications', viewFor(role, { modules: [] }))).toBe('/?panel=notifications');
    }
  });

  test('a role whose module is off still gets the notifications and nothing else it could not open', () => {
    const guard = viewFor('guard', { modules: [] });
    expect(guard.roleActive).toBe(false);
    expect(routeForScreen('notifications', guard)).toBe('/?panel=notifications');
    expect(routeForScreen('security', guard)).toBeNull();
    expect(routeForScreen('cameras', guard)).toBeNull();
    expect(routeForScreen('people', guard)).toBeNull();
  });

  test('the notifications follow notifications.read and nothing opens before the role is known', () => {
    const resident = viewFor('resident');
    const without = {
      ...resident,
      capabilities: new Set([...resident.capabilities].filter((id) => id !== CAPABILITY.notificationsRead)),
    };
    expect(routeForScreen('notifications', without)).toBeNull();
    const unknown = accessView({ ...accessFor('guest'), role: null, roleActive: false, capabilities: [] }, 'guest');
    expect(routeForScreen('notifications', unknown)).toBeNull();
    expect(routeForScreen('notifications', noContextView('guest'))).toBe('/?panel=notifications');
  });

  test('a screen the app does not know still falls back to nothing, notifications spelled another way included', () => {
    expect(routeForScreen('notification', viewFor('owner'))).toBeNull();
    expect(routeForScreen('Notifications', viewFor('owner'))).toBeNull();
    expect(routeForScreen('', viewFor('owner'))).toBeNull();
    expect(routeForScreen('notifications/../settings', viewFor('owner'))).toBeNull();
  });

  test('a camera is shown live unless a snapshot was asked for', () => {
    expect(cameraViewOf('snapshot')).toBe('snapshot');
    expect(cameraViewOf('live')).toBe('live');
    expect(cameraViewOf(undefined)).toBe('live');
    expect(cameraViewOf(3)).toBe('live');
  });
});

describe('voice actions on the wire', () => {
  test('a known action parses with its arguments and anything else is dropped', () => {
    expect(parseVoiceAction({ id: 3, name: 'app.open', arguments: { screen: 'agenda' } })).toEqual({
      id: '3',
      name: 'app.open',
      arguments: { screen: 'agenda' },
    });
    expect(parseVoiceAction({ id: 5, name: 'app.open', arguments: { screen: 'notifications' } })).toEqual({
      id: '5',
      name: 'app.open',
      arguments: { screen: 'notifications' },
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

  test('a camera fallback is spoken like a guard episode and a daily digest is not offered at all', () => {
    expect(
      callCameraEvent({ type: 'camera', body: 'Persona en Patio.', data: { cameraId: 2, kind: 'camera_fallback' }, cameras })
        ?.guardCopy,
    ).toBe('Persona en Patio.');
    expect(
      callCameraEvent({ type: 'camera', body: 'Resumen del día', data: { cameraId: 2, kind: 'guard_digest' }, cameras }),
    ).toBeNull();
  });

  test('other notifications and unknown cameras are not camera events', () => {
    expect(callCameraEvent({ type: 'reminder', body: '', data: { cameraName: 'Patio' }, cameras })).toBeNull();
    expect(callCameraEvent({ type: 'camera', body: '', data: { cameraId: 9 }, cameras })).toBeNull();
    expect(callCameraEvent({ type: 'camera', body: '', data: null, cameras })).toBeNull();
  });
});
