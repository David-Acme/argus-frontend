import { afterEach, describe, expect, test } from 'bun:test';
import { act, render } from '@testing-library/react';
import { auraField, auraTones, useEffectsOverrides } from '@/shared/theme';
import { Aura } from '@/shared/ui/aura/aura';
import { AuraBlobView } from '@/shared/ui/aura/aura-blob';
import { blobStops } from '@/shared/ui/aura/blob-stops';
import { screenFocus } from './screen-focus';

const reset = () =>
  useEffectsOverrides.setState({ reduceMotion: null, reduceTransparency: null, perfTier: null });

afterEach(() => {
  act(reset);
  screenFocus.focused = true;
});

const playStates = (root: Element) =>
  [...root.querySelectorAll('*')]
    .map((node) => (node as HTMLElement).style?.animationPlayState)
    .filter(Boolean);

describe('Aura', () => {
  test('every tone draws three blobs hidden from assistive technology', () => {
    for (const tone of auraTones) {
      const { container, unmount } = render(<Aura tone={tone} />);
      const field = container.firstElementChild;
      expect(field?.getAttribute('aria-hidden')).toBe('true');
      expect(container.querySelectorAll('radialGradient').length).toBe(3);
      unmount();
    }
  });

  test('the field fades to the background and the band does not', () => {
    const field = render(<Aura tone="calm" />);
    expect(field.container.querySelectorAll('linearGradient').length).toBe(1);
    field.unmount();
    const band = render(<Aura tone="calm" mode="band" />);
    expect(band.container.querySelectorAll('linearGradient').length).toBe(0);
  });

  test('reduced transparency turns the field into a flat tint, dimmed to the prototype opacity', () => {
    useEffectsOverrides.setState({ reduceTransparency: true });
    const { container } = render(<Aura tone="attn" />);
    const field = container.firstElementChild as HTMLElement;
    expect(Number(field.style.opacity)).toBeCloseTo(auraField.reducedOpacity * auraField.opacity);
    expect(container.querySelectorAll('radialGradient').length).toBe(0);
    expect((field.firstElementChild as HTMLElement).style.backgroundColor).not.toBe('');
  });

  test('reduced transparency and the low tier make the edge a steady 3 px rim', () => {
    for (const flags of [{ reduceTransparency: true }, { perfTier: 'low' as const }]) {
      act(() => useEffectsOverrides.setState(flags));
      const { container, unmount } = render(<Aura tone="listen" mode="edge" />);
      const rim = container.firstElementChild as HTMLElement;
      expect(rim.childElementCount).toBe(0);
      expect(rim.style.boxShadow).toContain('3px');
      unmount();
      act(reset);
    }
  });

  test('the edge glows with a pulse that reduced motion holds still', () => {
    const live = render(<Aura tone="listen" mode="edge" />);
    expect(live.container.firstElementChild?.childElementCount).toBe(1);
    live.unmount();
    useEffectsOverrides.setState({ reduceMotion: true });
    const still = render(<Aura tone="listen" mode="edge" />);
    expect(still.container.firstElementChild?.childElementCount).toBe(0);
  });

  test('the drift and the edge pulse pause while their screen is out of focus', () => {
    const shown = render(<Aura tone="calm" />);
    expect(playStates(shown.container)).toEqual(['running', 'running', 'running']);
    shown.unmount();
    screenFocus.focused = false;
    const hidden = render(
      <>
        <Aura tone="calm" />
        <Aura tone="listen" mode="edge" />
      </>
    );
    expect(playStates(hidden.container)).toEqual(['paused', 'paused', 'paused', 'paused']);
  });

  test('a blob pads its gradient past its own box by three blur radii', () => {
    const blob = auraField.blobs[1];
    const { container } = render(<AuraBlobView blob={blob} index={1} fill="red" drift={null} />);
    const frame = container.firstElementChild as HTMLElement;
    expect(frame.style.width).toBe(`${blob.width + auraField.blur * 6}px`);
    expect(frame.style.right).toBe(`${blob.right - auraField.blur * 3}px`);
  });

  test('the blob ramps from solid to clear like a 36 px blur', () => {
    const stops = blobStops(auraField.blobs[0]);
    expect(stops[0]?.opacity).toBeGreaterThan(0.99);
    expect(stops.at(-1)?.opacity).toBeLessThan(0.01);
    for (let index = 1; index < stops.length; index += 1)
      expect(stops[index]!.opacity).toBeLessThanOrEqual(stops[index - 1]!.opacity);
  });
});
