import { afterEach, describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { IncidentResponse } from '@/core/types';
import type { InicioHero as Hero } from '@/features/home/hooks/use-inicio-hero';
import '../../../shared/ui/translation-stub';
import { setWindowWidth } from '../../../shared/ui/window-width';

const routes: string[] = [];

const launched: string[] = [];

const asked: string[] = [];

const verdicts: string[] = [];

const access = { watch: true };

const marker = (name: string) =>
  function Marker() {
    return <span>{name}</span>;
  };

mock.module('expo-router', () => ({
  useRouter: () => ({ push: (href: string) => routes.push(href) }),
  useIsFocused: () => true,
  useFocusEffect: () => undefined,
}));

mock.module('@/shared/hooks/use-capabilities', () => ({
  useCapabilities: () => ({ cameraActions: { watch: access.watch } }),
}));

mock.module('@/features/command', () => ({
  useCommandLauncher: () => ({
    open: () => launched.push('search'),
    openNew: () => launched.push('new'),
  }),
}));

mock.module('@/features/home/hooks/use-ask-argus', () => ({
  useAskArgus: () => (draft: string) => asked.push(draft),
}));

mock.module('@/features/home/hooks/use-inicio-stats', () => ({
  useInicioStats: () => [
    { value: '5', label: 'cámaras', icon: 'cam', onPress: () => routes.push('/security') },
  ],
}));

mock.module('@/features/cameras', () => ({
  CameraLiveView: marker('live'),
  useCameraPrivacy: () => null,
}));

mock.module('@/features/safety', () => ({ PanicButton: marker('sos') }));

mock.module('@/features/home/components/hero/module-shortcuts', () => ({
  ModuleShortcuts: marker('shortcuts'),
}));

mock.module('@/shared/ui/presence', () => ({
  Presence: marker('estela'),
  useHeroPresence: () => false,
  useCentrePresence: () => false,
}));

mock.module('@/features/response', () => ({
  alertPlaceOf: (response: IncidentResponse) => response.cameraName || null,
  canDecide: (response: IncidentResponse) => response.mine?.reached === true,
  contactsOf: (response: IncidentResponse) => (response.showContacts ? response.contacts : []),
  emergencyOf: (response: IncidentResponse) =>
    response.showContacts ? response.emergencyNumber : null,
  phoneHref: (phone: string) => `tel:${phone}`,
  useResponseVerdict: () => async (response: IncidentResponse, verdict: string) => {
    verdicts.push(`${response.id}:${verdict}`);
    return true;
  },
}));

const { InicioHero } = await import('@/features/home/components/hero/inicio-hero');
const { InicioLead } = await import('@/features/home/components/hero/inicio-lead');
const { InicioAlert } = await import('@/features/home/components/hero/inicio-alert');

const HERO: Hero = {
  phase: 'calm',
  tone: 'calm',
  presence: 'idle',
  aura: 'calm',
  greeting: 'Buenas tardes, Ana',
  sentence: 'Todo tranquilo.',
  meta: 'Modo casa · Luis y tú en casa',
  alert: null,
  offlineAge: null,
};

const RESPONSE = {
  id: 7,
  cameraId: 3,
  cameraName: 'Patio trasero',
  showContacts: false,
  contacts: [{ name: 'Vecina', phone: '+51999111222', note: 'Tiene llave' }],
  emergencyNumber: '105',
  mine: { reached: true },
} as IncidentResponse;

afterEach(() => {
  setWindowWidth(360);
  routes.length = 0;
  launched.length = 0;
  asked.length = 0;
  verdicts.length = 0;
  access.watch = true;
});

describe('InicioHero', () => {
  test('a phone hero is the sentence, its meta and stats that open their screen', () => {
    render(<InicioHero hero={HERO} place="hero" />);
    expect(screen.getByRole('heading', { name: 'Todo tranquilo.' })).toBeDefined();
    expect(screen.getByText('Modo casa · Luis y tú en casa')).toBeDefined();
    fireEvent.click(screen.getByRole('link', { name: '5 cámaras' }));
    expect(routes).toEqual(['/security']);
    expect(screen.queryByRole('button', { name: /Nuevo/ })).toBeNull();
  });

  test('the desktop band carries Nuevo, which opens the new-item actions', () => {
    setWindowWidth(1280);
    render(<InicioHero hero={HERO} place="band" />);
    fireEvent.click(screen.getByRole('button', { name: /Nuevo/ }));
    expect(launched).toEqual(['new']);
  });

  test('on a phone, before the context, the hero is a skeleton', () => {
    render(<InicioHero hero={{ ...HERO, phase: 'loading' }} place="hero" />);
    expect(screen.getByRole('progressbar', { name: 'Cargando Inicio' })).toBeDefined();
    expect(screen.queryByText('5')).toBeNull();
  });

  test('on the band, before the context, the greeting stands alone with no stats', () => {
    setWindowWidth(1280);
    render(<InicioHero hero={{ ...HERO, phase: 'loading' }} place="band" />);
    expect(screen.getByRole('heading', { name: 'Buenas tardes, Ana' })).toBeDefined();
    expect(screen.queryByText('Modo casa · Luis y tú en casa')).toBeNull();
    expect(screen.queryByText('5')).toBeNull();
  });

  test('offline on a phone shows the age of the last known facts above the hero', () => {
    render(<InicioHero hero={{ ...HERO, offlineAge: 'hace 10 min' }} place="hero" />);
    expect(screen.getByText('Lo último que sé · hace 10 min')).toBeDefined();
  });
});

describe('InicioLead', () => {
  test('on the band the offline notice moves into the first column', () => {
    render(
      <InicioLead hero={{ ...HERO, offlineAge: 'hace 3 min' }} firstStep={null} sos={false} band />
    );
    expect(screen.getByText('Lo último que sé · hace 3 min')).toBeDefined();
  });

  test('a guest without Seguridad holds its SOS here', () => {
    render(<InicioLead hero={HERO} firstStep={null} sos band={false} />);
    expect(screen.getByText('sos')).toBeDefined();
  });

  test('the reminder first step asks Argus for one, never a manual form', () => {
    render(<InicioLead hero={HERO} firstStep="reminder" sos={false} band={false} />);
    expect(screen.getByText('Pide tu primer recordatorio')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Pedirle a Argus' }));
    expect(asked).toEqual(['Recuérdame ']);
    expect(launched).toEqual([]);
  });

  test('before the context there is no first step yet', () => {
    render(
      <InicioLead
        hero={{ ...HERO, phase: 'loading' }}
        firstStep="camera"
        sos={false}
        band={false}
      />
    );
    expect(screen.queryByText('Conecta tu primera cámara')).toBeNull();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  test('on the band, before the context, the agenda skeleton says Inicio is loading', () => {
    render(<InicioLead hero={{ ...HERO, phase: 'loading' }} firstStep={null} sos={false} band />);
    expect(screen.getByRole('progressbar', { name: 'Cargando Inicio' })).toBeDefined();
  });
});

describe('InicioAlert', () => {
  test('the alert card leaves the announcement to the hero and shows the camera live, Ver cámara first, then the two answers', async () => {
    render(<InicioAlert response={RESPONSE} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('live')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Ver cámara' }));
    expect(routes).toEqual(['/cameras/3']);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Es una falsa alarma' }));
    });
    expect(verdicts).toEqual(['7:false_alarm']);
  });

  test('without the camera right it sends to Seguridad and shows no media', () => {
    access.watch = false;
    render(<InicioAlert response={{ ...RESPONSE, mine: null }} />);
    expect(screen.queryByText('live')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Es real' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Seguridad' }));
    expect(routes).toEqual(['/security']);
  });

  test('once confirmed it offers the emergency call and the contacts', () => {
    render(<InicioAlert response={{ ...RESPONSE, showContacts: true, mine: null }} />);
    expect(screen.getByRole('button', { name: 'Llamar al 105' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Llamar a Vecina' })).toBeDefined();
  });
});
