import { afterEach, describe, expect, test } from 'bun:test';
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { Text } from 'react-native';
import { Section } from '@/shared/ui/section/section';
import { Screen } from '@/shared/ui/screen/screen';
import { useGrowsInColumn, useInScreenColumn } from '@/shared/ui/screen/screen-column-context';
import { ScreenColumn, ScreenColumns } from '@/shared/ui/screen/screen-columns';
import { ScreenScroll } from '@/shared/ui/screen/screen-scroll';
import { ScreenScroll as NativeScreenScroll } from '@/shared/ui/screen/screen-scroll.native';
import { ScreenTopBar } from '@/shared/ui/screen/screen-top-bar';
import { useScreenScroll } from '@/shared/ui/screen/use-screen-scroll';
import { setWindowWidth } from './window-width';

afterEach(() => setWindowWidth(360));

describe('Screen', () => {
  test('the top bar carries the title, the back button and the actions', () => {
    const pressed: string[] = [];
    render(
      <Screen
        title="Seguridad"
        back={{ label: 'Volver', onPress: () => void pressed.push('back') }}
        actions={<Text>SOS</Text>}>
        <Text>cuerpo</Text>
      </Screen>
    );
    expect(screen.getByRole('heading', { name: 'Seguridad' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(pressed).toEqual(['back']);
    expect(screen.getByText('SOS')).toBeDefined();
    expect(screen.getByText('cuerpo')).toBeDefined();
  });

  test('a greeting screen draws the aura and the inline updating pill', () => {
    const { container } = render(
      <Screen aura="calm" meta="Buenas tardes, Ana" updating="Actualizando">
        <Text>Inicio</Text>
      </Screen>
    );
    expect(screen.getByText('Buenas tardes, Ana')).toBeDefined();
    expect(screen.getByText('Actualizando')).toBeDefined();
    expect(container.querySelectorAll('radialGradient').length).toBe(3);
  });

  test('a screen without bar content draws no top bar', () => {
    render(
      <Screen>
        <Text>solo</Text>
      </Screen>
    );
    expect(screen.queryByRole('heading')).toBeNull();
  });

  test('on a phone the columns stack inside the one scroll', () => {
    render(
      <Screen columns>
        <ScreenColumns>
          <ScreenColumn label="Ahora">
            <Section title="Ahora">
              <Text>a</Text>
            </Section>
          </ScreenColumn>
        </ScreenColumns>
      </Screen>
    );
    expect(screen.queryByLabelText('Ahora')).toBeNull();
    expect(screen.getByText('a')).toBeDefined();
  });

  test('on a laptop each column scrolls on its own and tells its sections', () => {
    setWindowWidth(1280);
    const seen: boolean[] = [];
    function Probe() {
      seen.push(useInScreenColumn());
      return null;
    }
    render(
      <Screen columns>
        <ScreenColumns>
          <ScreenColumn label="Ahora" width={320}>
            <Probe />
          </ScreenColumn>
          <ScreenColumn label="Novedades">
            <Text>b</Text>
          </ScreenColumn>
        </ScreenColumns>
      </Screen>
    );
    expect(screen.getByLabelText('Ahora')).toBeDefined();
    expect(screen.getByLabelText('Novedades')).toBeDefined();
    expect(seen).toContain(true);
  });

  test('outside a column a section is not sticky', () => {
    expect(renderHook(() => useInScreenColumn()).result.current).toBe(false);
  });

  function growthOf(grows?: number): Record<string, boolean> {
    setWindowWidth(1280);
    const seen: Record<string, boolean> = {};
    function Probe({ name }: { name: string }) {
      seen[name] = useGrowsInColumn();
      return (
        <Section title={name}>
          <Text>{name}</Text>
        </Section>
      );
    }
    render(
      <Screen columns>
        <ScreenColumns>
          <ScreenColumn label="Agenda" width={320} grows={grows}>
            <Probe name="Ahora" />
            <Probe name="Hoy" />
            <Probe name="Mañana" />
          </ScreenColumn>
        </ScreenColumns>
      </Screen>
    );
    return seen;
  }

  test('in a column of three sections only the last grows to the bottom', () => {
    expect(growthOf()).toEqual({ Ahora: false, Hoy: false, Mañana: true });
  });

  test('a column that names the section to grow grows that one and not its last', () => {
    expect(growthOf(0)).toEqual({ Ahora: true, Hoy: false, Mañana: false });
  });

  test('outside a column nothing grows', () => {
    expect(renderHook(() => useGrowsInColumn()).result.current).toBe(false);
  });

  test('the top bar and both scroll owners render alone', () => {
    render(<ScreenTopBar meta="Hola" />);
    expect(screen.getByText('Hola')).toBeDefined();
    const onScroll = renderHook(() => useScreenScroll(300)).result.current.onScroll;
    for (const Scroll of [ScreenScroll, NativeScreenScroll]) {
      const { unmount } = render(
        <Scroll
          onScroll={onScroll}
          contentStyle={{}}
          refresh={{ refreshing: false, onRefresh: () => undefined }}>
          <Text>dentro</Text>
        </Scroll>
      );
      expect(screen.getByText('dentro')).toBeDefined();
      unmount();
    }
  });
});
