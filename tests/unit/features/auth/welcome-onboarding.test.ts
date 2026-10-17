import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { TranslateFn } from '@/core/types';
import { hrefOf, ONBOARDING_FLOWS } from '@/features/auth/model/onboarding-flow';

const es = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.es, key as never, params as never)) as TranslateFn;
const en = ((key: string, params?: Record<string, string>) =>
  translate(localeDictionaries.en, key as never, params as never)) as TranslateFn;

const authSource = (relative: string) =>
  readFileSync(join(import.meta.dir, '../../../../src/features/auth', relative), 'utf8');

const HERO = 'Argus greets you with its modules: Security, Productivity and Agronomy, coming soon.';

describe('the hero the welcome e2e greets by name', () => {
  test('it is one labeled button, and the replay it offers is a hint rather than part of the name', () => {
    expect(en('screens.welcome.hero-label')).toBe(HERO);
    expect(es('screens.welcome.hero-label')).toBe(
      'Argus te saluda con sus módulos: Seguridad, Productividad y Agronomía, que llega pronto.'
    );
    expect(en('screens.welcome.hero-replay-hint')).toBe('Tap it to have Argus greet you again.');
    expect(es('screens.welcome.hero-replay-hint')).toBe(
      'Tócalo para que Argus vuelva a saludarte.'
    );

    const hero = authSource('components/welcome-mascot/welcome-hero.tsx');
    expect(hero).toContain('type WelcomeHeroProps = {\n  scale: number;\n  label: string;\n};');
    expect(hero).toContain(
      'accessible\n        accessibilityRole="button"\n        accessibilityLabel={label}'
    );
    expect(hero).toContain("accessibilityHint={t('screens.welcome.hero-replay-hint')}");
    expect(hero).toContain('onPress={replay}');
    expect(hero).not.toContain('accessibilityLabel="');
  });

  test('the stage has one control and nothing else, and what is decoration stays out of the tree', () => {
    const hero = authSource('components/welcome-mascot/welcome-hero.tsx');
    expect(hero.match(/accessibilityRole/g)).toHaveLength(1);
    expect(hero.match(/aria-hidden/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(authSource('components/welcome-mascot/orbit-track.tsx')).toContain('aria-hidden');
    expect(authSource('components/welcome-mascot/orbit-chip.tsx')).toContain('aria-hidden');
    expect(hero).toContain('<Text variant="subhead">{t(\'screens.welcome.hello\')}</Text>');
    expect(en('screens.welcome.hello')).toBe('Hi!');
    expect(es('screens.welcome.hello')).toBe('¡Hola!');
  });
});

describe('the welcome screen the e2e starts from', () => {
  test('the title is a heading and the hero receives the label the e2e names', () => {
    expect(en('screens.welcome.title')).toBe('Hi, I am Argus');
    expect(es('screens.welcome.title')).toBe('Hola, soy Argus');

    const screen = authSource('screens/welcome-screen.tsx');
    expect(screen).toContain("label={t('screens.welcome.hero-label')}");
    expect(screen).toMatch(
      /<Text variant="display"[\s\S]{0,120}\{t\('screens\.welcome\.title'\)\}/
    );
  });

  test('Get started starts the owner flow where the e2e lands, and the invitation entry is native only', () => {
    expect(en('screens.welcome.cta')).toBe('Get started');
    expect(es('screens.welcome.cta')).toBe('Comenzar');
    expect(en('screens.welcome.join-invitation')).toBe('I have an invitation');

    const [ownerStart] = ONBOARDING_FLOWS.owner;
    expect(ownerStart?.id).toBe('pair');
    expect(hrefOf('owner', ownerStart!)).toEqual({
      pathname: '/welcome/pairing',
      params: { flow: 'owner' },
    });

    const screen = authSource('screens/welcome-screen.tsx');
    expect(screen).toContain('onPress={handleStart}');
    expect(screen).toContain("router.push(hrefOf('owner', ownerStart))");
    expect(screen).toContain("router.push(hrefOf('invited', invitedStart))");
    expect(screen).toMatch(
      /IS_NATIVE \? \(\s*<Button variant="ghost" onPress=\{handleInvitation\}>/
    );
    expect(screen).toMatch(/<Text>\{t\('screens\.welcome\.cta'\)\}<\/Text>/);
  });
});

describe('the pairing screen the e2e types the code into', () => {
  test('its heading, its code field and its Continue are the strings the e2e reads', () => {
    expect(en('screens.pairing.title')).toBe('Link your server');
    expect(es('screens.pairing.title')).toBe('Vincula tu servidor');
    expect(en('screens.pairing.code-placeholder')).toBe('Pairing code');
    expect(es('screens.pairing.code-placeholder')).toBe('Código de vinculación');
    expect(en('common.continue')).toBe('Continue');
    expect(es('common.continue')).toBe('Continuar');
    expect(en('screens.pairing.enter-code')).toBe('Enter code manually');
  });

  test('the screen names the field and hands the code to the flow', () => {
    const screen = authSource('screens/pairing-screen.tsx');
    expect(screen).toContain('<Text variant="title">{t(\'screens.pairing.title\')}</Text>');
    expect(screen).toContain('label="screens.pairing.enter-code"');
    expect(screen).toContain('placeholder="screens.pairing.code-placeholder"');
    expect(screen).toContain('invalid={invalidCode}');
    expect(screen).toContain('onSubmit={handleCode}');
    expect(screen).toContain('void flow.run(code, address)');
    expect(screen).toContain("flow.error?.code === 'INVALID_PAIRING_CODE'");
    expect(screen).toMatch(
      /flow\.phase === 'idle' \|\| flow\.phase === 'error' \? \(\s*<QrManualEntry/
    );
  });

  test('the Continue of the code field waits for a code and sends what was typed', () => {
    const entry = readFileSync(
      join(import.meta.dir, '../../../../src/features/qr/components/qr-manual-entry.tsx'),
      'utf8'
    );
    expect(entry).toContain('const trimmed = value.trim();');
    expect(entry).toContain('disabled={trimmed.length === 0}');
    expect(entry).toMatch(/if \(trimmed\.length === 0\) \{\s*return;\s*\}\s*onSubmit\(trimmed\);/);
    expect(entry).toContain("accessibilityLabel={t('common.continue')}");
  });

  test('a code that does not match is the only refusal that marks the field itself', () => {
    const screen = authSource('screens/pairing-screen.tsx');
    expect(screen).toMatch(
      /const invalidCode = flow\.phase === 'error' && flow\.error\?\.code === 'INVALID_PAIRING_CODE'/
    );
    expect(en('screens.pairing.errors.invalid-code')).toBe(
      "That code doesn't match your server's. Check it character by character."
    );
    expect(es('screens.pairing.errors.invalid-code')).toBe(
      'Ese código no coincide con el de tu servidor. Revísalo letra por letra.'
    );
  });
});
