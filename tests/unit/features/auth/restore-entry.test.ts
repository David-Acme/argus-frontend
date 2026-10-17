import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (path: string): string => readFileSync(join(import.meta.dir, '../../../../src', path), 'utf8');

describe('the one-step re-entry after a lost session', () => {
  test('the entry gate asks the pure rule and opens the face screen with the restore flag', () => {
    const entryGate = source('features/auth/components/entry-gate.tsx');
    expect(entryGate).toContain('restoreEntryOf({ paired: pairing.paired, report: sessionService.restoreReport() })');
    expect(entryGate).toContain("params: { mode: 'login', restore: '1' }");
  });

  test('the face screen hands the restore flag to the intro and the capture hook', () => {
    const faceScreen = source('features/auth/screens/face-screen.tsx');
    expect(faceScreen).toContain("const restoring = restore === '1' && mode === 'login';");
    expect(faceScreen).toContain('useFaceCapture({ mode, restoring })');
    expect(faceScreen).toContain('restoring={restoring}');
  });

  test('the intro shows the restore copy when restoring', () => {
    const intro = source('features/auth/components/face-intro.tsx');
    expect(intro).toContain("t('screens.face.restore-title')");
    expect(intro).toContain("t('screens.face.restore-body')");
  });

  test('the restore copy exists in both languages, word for word', () => {
    expect(source('core/i18n/locales/es/screens/face/index.ts')).toContain(
      "'restore-title': 'Vuelve a entrar con tu rostro'"
    );
    expect(source('core/i18n/locales/en/screens/face/index.ts')).toContain(
      "'restore-title': 'Sign back in with your face'"
    );
  });
});
