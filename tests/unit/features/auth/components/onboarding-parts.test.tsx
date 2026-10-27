import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import * as constants from '@/shared/constants';
import { size, space } from '@/shared/theme';
import { setWindowSize } from '../../../shared/ui/window-width';
import '../../../shared/ui/translation-stub';

const marker = (name: string) =>
  function Marker() {
    return <div>{name}</div>;
  };

mock.module('@/shared/constants', () => ({ ...constants, IS_NATIVE: true, IS_WEB: false }));
mock.module('@/shared/ui/presence', () => ({
  Presence: marker('estela'),
  useHeroPresence: () => false,
  useCentrePresence: () => false,
}));
mock.module('@/shared/components/ui/lazy-qr-code', () => ({ LazyQrCode: marker('código qr') }));
mock.module('@/shared/components/device-camera/device-camera', () => ({
  DeviceCamera: marker('cámara'),
}));
mock.module('@/features/modules', () => ({ useModuleCatalog: () => null }));
mock.module('@/features/privacy', () => ({ signalsToAsk: () => [] }));
mock.module('@/shared/hooks/use-date-formatter', () => ({
  useDateFormatter: () => ({ formatTime: () => '21:54' }),
}));
mock.module('expo-router', () => ({
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
  usePathname: () => '/welcome',
}));

const { OnboardingFrame } = await import('@/features/auth/components/onboarding-frame');
const { OnboardingHeading } = await import('@/features/auth/components/onboarding-heading');
const { OnboardingMid } = await import('@/features/auth/components/onboarding-mid');
const { OnboardingTop } = await import('@/features/auth/components/onboarding-top');
const { PrivacyLine } = await import('@/features/auth/components/privacy-line');
const { InfoRows } = await import('@/features/auth/components/info-rows');
const { FaceFinder } = await import('@/features/auth/components/face-finder');
const { FaceLens } = await import('@/features/auth/components/face-lens');
const { FaceDenied } = await import('@/features/auth/components/face-denied');
const { LoginQrCard } = await import('@/features/auth/components/login-qr-card');
const { ModuleChoiceCard } = await import('@/features/auth/components/module-choice-card');
const { ApproveCard } = await import('@/features/auth/components/approve-card');
const { onboardingLayoutOf } = await import('@/features/auth/model/onboarding-layout');

beforeEach(() => setWindowSize(390, 844));

describe('the onboarding frame', () => {
  test('lays out top, body and footer on a phone and in a card', () => {
    const view = render(
      <OnboardingFrame top={<div>arriba</div>} footer={<div>pie</div>}>
        <div>cuerpo</div>
      </OnboardingFrame>
    );
    expect(screen.getByText('arriba')).toBeDefined();
    expect(screen.getByText('cuerpo')).toBeDefined();
    expect(screen.getByText('pie')).toBeDefined();
    setWindowSize(1440, 900);
    view.rerender(
      <OnboardingFrame tone="dark" footer={<div>pie</div>}>
        <div>cuerpo</div>
      </OnboardingFrame>
    );
    expect(screen.getByText('cuerpo')).toBeDefined();
  });

  test('the top bar goes back and shows the step dots with their name', () => {
    let back = 0;
    render(
      <OnboardingTop onBack={() => void (back += 1)} place={{ flow: 'owner', step: 'face' }} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(back).toBe(1);
    const dots = screen.getByRole('progressbar');
    expect(dots.getAttribute('aria-label')).toBe('Paso 3 de 6. Tu cara');
  });

  test('a step outside the count shows no dots', () => {
    render(<OnboardingTop place={{ flow: 'owner', step: 'permissions' }} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  test('titles stay left with their lead, other blocks sit centred', () => {
    render(
      <>
        <OnboardingHeading title="Conecta con tu Argus" lead="Escribe el código" mark="estela" />
        <OnboardingHeading title="Este no parece tu Argus" mark={{ icon: 'alert', alert: true }} />
        <OnboardingMid form>
          <PrivacyLine text="Se queda en tu casa." />
        </OnboardingMid>
      </>
    );
    expect(screen.getByRole('heading', { name: 'Conecta con tu Argus' })).toBeDefined();
    expect(screen.getByText('Escribe el código')).toBeDefined();
    expect(screen.getByText('estela')).toBeDefined();
    expect(screen.getByText('Se queda en tu casa.')).toBeDefined();
  });

  test('info rows read their copy', () => {
    render(
      <InfoRows
        rows={[
          {
            key: 'a',
            icon: 'shield',
            title: 'screens.welcome.rows.home.title',
            meta: 'screens.welcome.rows.home.meta',
            done: true,
          },
        ]}
      />
    );
    expect(screen.getByText('Vigilo tu casa')).toBeDefined();
    expect(screen.getByText('Cámaras, visitas y alertas tranquilas')).toBeDefined();
  });
});

describe('the face finder', () => {
  test('reports its progress and shows the check when done', () => {
    const view = render(<FaceFinder size={268} progress={0.5} label="Avance" />);
    expect(screen.getByRole('progressbar', { name: 'Avance' }).getAttribute('aria-valuenow')).toBe(
      '50'
    );
    view.rerender(<FaceFinder size={268} progress={1} done label="Avance" />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
  });

  test('the lens shows the camera only once it is allowed', () => {
    const lens = (active: boolean) => (
      <FaceLens
        active={active}
        cameraRef={{ current: null }}
        detects
        onReady={() => undefined}
        onFaces={() => undefined}
      />
    );
    const view = render(lens(true));
    expect(screen.getByText('cámara')).toBeDefined();
    view.rerender(lens(false));
    expect(screen.queryByText('cámara')).toBeNull();
  });

  test('without the camera it asks again', () => {
    let asked = 0;
    render(<FaceDenied tone="dark" top={{}} onAskAgain={async () => void (asked += 1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver a preguntar' }));
    expect(asked).toBe(1);
  });
});

describe('the sign-in cards', () => {
  test('the QR card counts down and lists the steps for another device', () => {
    render(
      <LoginQrCard
        qr={{
          phase: 'qr',
          challengeId: 'a'.repeat(64),
          expiresAt: Math.floor(Date.now() / 1000) + 61,
          refresh: async () => undefined,
          retryOwner: async () => undefined,
        }}
      />
    );
    expect(screen.getByText('código qr')).toBeDefined();
    expect(screen.getByText(/otro dispositivo · caduca en 1:0[01]/)).toBeDefined();
    expect(screen.getByText('Abre Argus en tu otro dispositivo')).toBeDefined();
  });

  test('a module card is a checkbox', () => {
    let toggled = '';
    render(
      <ModuleChoiceCard
        card={{
          id: 'productivity',
          name: 'Productividad',
          summary: 'Agenda',
          note: 'Funciona desde ya',
          selected: false,
          selectable: true,
        }}
        onToggle={(id) => void (toggled = id)}
      />
    );
    const card = screen.getByRole('checkbox', { name: 'Productividad' });
    expect(card.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(card);
    expect(toggled).toBe('productivity');
  });

  test('the approval card warns when the request comes from outside', () => {
    render(
      <ApproveCard
        details={{
          challengeId: 'x',
          platform: 'android',
          deviceName: '',
          origin: 'tunnel',
          ipAddress: '',
          createdAt: 0,
          expiresAt: 0,
        }}
      />
    );
    expect(screen.getByText('Teléfono Android')).toBeDefined();
    expect(screen.getByText('Fuera de casa')).toBeDefined();
    expect(screen.getByText(/Esto llega desde fuera de tu casa/)).toBeDefined();
  });
});

describe('the onboarding layout', () => {
  test('a phone is full screen, scaled by height', () => {
    expect(onboardingLayoutOf({ width: 390, height: 844 })).toEqual({
      card: false,
      hero: size.presenceWelcome,
      finder: size.finder,
      top: space[6],
    });
    expect(onboardingLayoutOf({ width: 360, height: 640 })).toMatchObject({
      finder: size.finderShort,
    });
    expect(onboardingLayoutOf({ width: 320, height: 568 })).toMatchObject({
      finder: size.finderTiny,
    });
  });

  test('a phone on its side keeps the smallest finder', () => {
    expect(onboardingLayoutOf({ width: 844, height: 390 })).toMatchObject({
      card: false,
      finder: size.finderLandscape,
    });
  });

  test('tablet and desktop get one centred card', () => {
    expect(onboardingLayoutOf({ width: 820, height: 1180 }).card).toBe(true);
    expect(onboardingLayoutOf({ width: 1440, height: 900 })).toMatchObject({ card: true, top: 0 });
  });
});
