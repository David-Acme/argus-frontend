import { afterEach, describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { localeDictionaries } from '@/core/i18n/locales';
import { translate } from '@/core/i18n/translate';
import type { RecentClipsData } from '@/features/home/hooks/use-recent-clip-tiles';
import { screenFocus } from '../../../shared/ui/screen-focus';
import { setWindowWidth } from '../../../shared/ui/window-width';
import '../../../shared/ui/translation-stub';

const pushed: string[] = [];

const NOW = new Date(2026, 9, 21, 15, 0).getTime();

let data: RecentClipsData;

function recent(overrides: Partial<RecentClipsData>): RecentClipsData {
  return {
    visible: true,
    clips: [
      {
        id: '9',
        cameraId: '4',
        cameraName: 'Puerta principal',
        at: new Date(2026, 9, 21, 14, 45).getTime(),
      },
      {
        id: '8',
        cameraId: '2',
        cameraName: 'Patio trasero',
        at: new Date(2026, 9, 20, 11, 20).getTime(),
      },
    ],
    now: NOW,
    format: {
      t: (key, ...rest) => translate(localeDictionaries.es, key, ...rest),
      time: (value) => `${value.getHours()}:${String(value.getMinutes()).padStart(2, '0')}`,
      day: () => 'lun',
    },
    ...overrides,
  };
}

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ setParams: () => undefined, push: (href: string) => pushed.push(href) }),
  useIsFocused: () => screenFocus.focused,
}));

mock.module('@/features/home/hooks/use-recent-clip-tiles', () => ({
  useRecentClipTiles: () => data,
}));

mock.module('@/shared/components/layout/use-offline-notice', () => ({
  useOfflineNotice: () => false,
}));

const { RecentClipsSection } =
  await import('@/features/home/components/cameras/recent-clips-section');
const { ScreenColumn, ScreenColumns } = await import('@/shared/ui/screen/screen-columns');

afterEach(() => {
  setWindowWidth(360);
  pushed.length = 0;
});

describe('RecentClipsSection', () => {
  test('two clips side by side, each with its camera and its time, open their camera', () => {
    data = recent({});
    render(<RecentClipsSection />);
    expect(screen.getByRole('heading', { name: 'Clips recientes' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Puerta principal, 14:45' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver el clip de Patio trasero' }));
    expect(screen.getByText('ayer 11:20')).toBeDefined();
    expect(pushed).toEqual(['/cameras/4', '/cameras/2']);
  });

  test('in a desktop column one clip keeps half the width', () => {
    setWindowWidth(1920);
    data = recent({ clips: recent({}).clips.slice(0, 1) });
    render(
      <ScreenColumns>
        <ScreenColumn label="En casa">
          <RecentClipsSection />
        </ScreenColumn>
      </ScreenColumns>
    );
    expect(screen.getByRole('button', { name: 'Puerta principal, 14:45' })).toBeDefined();
  });

  test('without clips, or without the right to see them, it renders nothing', () => {
    data = recent({ visible: false, clips: [] });
    const { container } = render(<RecentClipsSection />);
    expect(container.textContent).toBe('');
  });
});
