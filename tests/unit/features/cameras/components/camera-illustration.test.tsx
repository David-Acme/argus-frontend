import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import type { ICameraCatalogModel } from '@/core/interfaces';
import type { CameraFormFactor } from '@/core/types';
import '../../../shared/ui/translation-stub';

const { CameraIllustration } = await import('@/features/cameras/components/camera-illustration');
const { roundRect } = await import('@/features/cameras/components/camera-illustration-parts');
const { Bullet } = await import('@/features/cameras/components/camera-illustration-shapes');
const { Doorbell } = await import('@/features/cameras/components/camera-illustration-ceiling');
const { ModelDetail } = await import('@/features/cameras/components/camera-setup/model-detail');
const { cameraLookOf } = await import('@/features/cameras/model/camera-looks');

const LOOKS: readonly [string, CameraFormFactor][] = [
  ['pill', 'cube'],
  ['box-spot', 'cube'],
  ['egg', 'pan-tilt'],
  ['sphere-antenna', 'pan-tilt'],
  ['bullet-antennas-spot', 'bullet'],
  ['battery-bullet', 'bullet'],
  ['outdoor-antennas-spot', 'outdoor-pan-tilt'],
  ['turret-spot', 'turret'],
  ['dome', 'dome'],
  ['ptz-mini', 'outdoor-pan-tilt'],
  ['doorbell-tall', 'doorbell'],
  ['', 'bullet'],
];

const PALETTE = {
  line: '#000',
  body: '#fff',
  shade: '#eee',
  face: '#111',
  glass: '#777',
  ring: '#b90',
  shine: '#fafafa',
  glow: '#fed',
};

const C125: ICameraCatalogModel = {
  id: 'tapo-c125',
  brand: 'TP-Link Tapo',
  manufacturer: 'TP-Link',
  model: 'C125',
  driver: 'tapo',
  formFactor: 'cube',
  outdoor: false,
  generic: false,
  resolution: '2560x1440',
  subResolution: '1280x720',
  defaults: {
    port: 554,
    onvifPort: 2020,
    username: '',
    streamPath: '/stream1',
    subStreamPath: '/stream2',
  },
  features: {
    ptz: false,
    presets: false,
    autoTrack: false,
    microphone: true,
    speaker: true,
    siren: true,
    privacy: true,
    led: true,
    dayNight: true,
    motion: true,
    sdCard: true,
  },
  note: 'tapo-camera-account',
  support: 'full',
  tested: true,
  look: 'wide-box',
  specs: null,
  source: 'https://www.tp-link.com/us/home-networking/cloud-camera/tapo-c125/',
};

describe('the camera drawings', () => {
  test('every look draws its silhouette', () => {
    for (const [look, formFactor] of LOOKS) {
      const { container, unmount } = render(
        <CameraIllustration formFactor={formFactor} look={look} size={64} />
      );
      expect(container.querySelectorAll('svg').length).toBe(1);
      expect(container.querySelectorAll('path, circle, ellipse').length).toBeGreaterThan(3);
      unmount();
    }
  });

  test('a rounded box is a closed path that never rounds past half its side', () => {
    const path = roundRect({ left: 0, top: 0, width: 10, height: 4, radius: 9 });
    expect(path.startsWith('M2 0')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  test('the shapes read their traits from the look', () => {
    const bullet = render(
      <svg>
        <Bullet palette={PALETTE} look={cameraLookOf('bullet-antennas-spot', 'bullet')} />
        <Doorbell palette={PALETTE} look={cameraLookOf('doorbell-slim', 'doorbell')} />
      </svg>
    );
    expect(bullet.container.querySelectorAll('line').length).toBeGreaterThan(2);
    bullet.unmount();
  });

  test('a model without researched specs still says how Argus supports it', () => {
    render(<ModelDetail model={C125} />);
    expect(screen.getByText('Completa')).toBeDefined();
    expect(screen.getByText('Probada con Argus')).toBeDefined();
    expect(screen.getByText('Hablar')).toBeDefined();
    expect(screen.queryByText('Especificaciones')).toBeNull();
    expect(screen.getByText('Datos de la ficha oficial en tp-link.com')).toBeDefined();
  });
});
