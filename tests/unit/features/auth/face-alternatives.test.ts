import { describe, expect, test } from 'bun:test';
import { faceAlternatives, FACE_ALTERNATIVE_LABEL_KEYS } from '@/features/auth/model/face-alternatives';

describe('faceAlternatives', () => {
  test('a login always offers the QR sign-in and the way back', () => {
    for (const stuck of [false, true]) {
      expect(faceAlternatives({ enrolling: false, stuck }).actions).toEqual(['login-qr', 'back-to-start']);
    }
  });

  test('an enrolment only offers the way back', () => {
    expect(faceAlternatives({ enrolling: true, stuck: false }).actions).toEqual(['back-to-start']);
    expect(faceAlternatives({ enrolling: true, stuck: true }).actions).toEqual(['back-to-start']);
  });

  test('the hint appears only once the camera has given up', () => {
    expect(faceAlternatives({ enrolling: false, stuck: false }).hint).toBeNull();
    expect(faceAlternatives({ enrolling: false, stuck: true }).hint).toBe('screens.face.stuck-hint');
    expect(faceAlternatives({ enrolling: true, stuck: true }).hint).toBe('screens.face.stuck-hint');
  });

  test('the actions keep naming their own strings', () => {
    expect(FACE_ALTERNATIVE_LABEL_KEYS['login-qr']).toBe('screens.face.qr-login');
    expect(FACE_ALTERNATIVE_LABEL_KEYS['back-to-start']).toBe('screens.face.back-to-start');
  });
});
