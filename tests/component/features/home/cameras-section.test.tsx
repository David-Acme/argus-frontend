import { afterEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type {
  CameraSectionData,
  CameraSectionForm,
} from '@/features/home/hooks/use-camera-section';
import type { MomentFormat } from '@/features/home/model/camera-moments';
import { screenFocus } from '../../../unit/shared/ui/screen-focus';
import '../../../unit/shared/ui/translation-stub';

const pushed: string[] = [];

const forms: CameraSectionForm[] = [];

const format: MomentFormat = {
  t: (key, ...rest) => translate(localeDictionaries.es, key, ...rest),
  time: () => '14:47',
  day: () => 'lun',
};

const NOW = new Date(2026, 9, 21, 15, 0).getTime();

let data: CameraSectionData;

function sectionData(overrides: Partial<CameraSectionData>): CameraSectionData {
  return {
    visible: true,
    tiles: [
      { id: '1', name: 'Cocina', state: 'live', at: NOW - 600_000 },
      { id: '2', name: 'Patio trasero', state: 'live', at: null },
      { id: '3', name: 'Dormitorio', state: 'private', at: null },
    ],
    frames: new Map([['1', 'data:image/jpeg;base64,AAAA']]),
    latestClip: { id: '9', cameraId: '4', cameraName: 'Puerta principal', at: NOW - 900_000 },
    now: NOW,
    format,
    ...overrides,
  };
}

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ setParams: () => undefined, push: (href: string) => pushed.push(href) }),
  useIsFocused: () => screenFocus.focused,
}));

mock.module('@/features/home/hooks/use-camera-section', () => ({
  useCameraSection: (form: CameraSectionForm) => {
    forms.push(form);
    return data;
  },
}));

const { CamerasSection } = await import('@/features/home/components/cameras/cameras-section');
const { CameraMedia, ClipMedia } = await import('@/features/home/components/cameras/camera-media');
const { ScreenColumnProvider } = await import('@/shared/ui/screen/screen-column-context');

function InColumn({ children }: { children: ReactNode }) {
  return <ScreenColumnProvider value>{children}</ScreenColumnProvider>;
}

afterEach(() => {
  pushed.length = 0;
  forms.length = 0;
});

describe('CamerasSection', () => {
  test('on a phone the strip opens with the latest clip, then the cameras', () => {
    data = sectionData({});
    render(<CamerasSection />);
    const strip = screen.getByLabelText('Cámaras y último clip');
    const tiles = [...strip.querySelectorAll('[role="button"][aria-label]')]
      .map((node) => node.getAttribute('aria-label'))
      .filter((label) => !label?.startsWith('Ver el clip'));
    expect(tiles).toEqual([
      'Clip · Puerta principal, 14:47',
      'Cocina, En vivo, 14:47',
      'Patio trasero, En vivo, sin novedad',
      'Dormitorio, Privada',
    ]);
    expect(forms.at(-1)).toEqual({ grid: false, wide: false });
  });

  test('a tap opens the camera, the play button opens the clip’s camera, the link opens Seguridad', () => {
    data = sectionData({});
    render(<CamerasSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Cocina, En vivo, 14:47' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver el clip de Puerta principal' }));
    fireEvent.click(screen.getByRole('link', { name: 'Seguridad' }));
    expect(pushed).toEqual(['/cameras/1', '/cameras/4', '/security']);
  });

  test('without a clip the strip starts with the cameras', () => {
    data = sectionData({ latestClip: null });
    render(<CamerasSection />);
    expect(screen.queryByText('Clip · Puerta principal')).toBeNull();
    expect(screen.getByText('Cocina')).toBeDefined();
  });

  test('in a desktop column the cameras fill a grid with no clip and no strip', () => {
    data = sectionData({ latestClip: null });
    render(
      <InColumn>
        <CamerasSection />
      </InColumn>
    );
    expect(screen.queryByLabelText('Cámaras y último clip')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Cámaras' })).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Patio trasero, En vivo, sin novedad' })
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Dormitorio, Privada' })).toBeDefined();
    expect(forms.at(-1)?.grid).toBe(true);
  });

  test('with the module off or no camera to show it renders nothing', () => {
    data = sectionData({ visible: false });
    const { container } = render(<CamerasSection />);
    expect(container.textContent).toBe('');
  });

  test('a camera without a picture says why in words, and a clip names its camera', () => {
    const opened: string[] = [];
    render(
      <>
        <CameraMedia
          tile={{ id: '5', name: 'Garaje', state: 'offline', at: null }}
          detail="Sin conexión"
          onOpen={(id) => opened.push(id)}
        />
        <ClipMedia
          clip={{ id: '9', cameraId: '4', cameraName: 'Puerta principal', at: NOW }}
          detail="14:45"
          named={false}
          onOpen={(id) => opened.push(id)}
        />
      </>
    );
    expect(screen.queryByText('En vivo')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Garaje, Sin conexión' }));
    fireEvent.click(screen.getByRole('button', { name: 'Puerta principal, 14:45' }));
    expect(opened).toEqual(['5', '4']);
  });
});
