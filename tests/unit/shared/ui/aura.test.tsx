import { afterEach, describe, expect, test } from 'bun:test';
import { act, render } from '@testing-library/react';
import { auraField, auraTones, useEffectsOverrides } from '@/shared/theme';
import { Aura } from '@/shared/ui/aura/aura';
import { AuraBlobView } from '@/shared/ui/aura/aura-blob';
import { blobStops } from '@/shared/ui/aura/blob-stops';

const reset = () =>
  useEffectsOverrides.setState({ reduceMotion: null, reduceTransparency: null, perfTier: null });

afterEach(() => act(reset));

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

  test('reduced transparency dims the field to the prototype opacity', () => {
    useEffectsOverrides.setState({ reduceTransparency: true });
    const { container } = render(<Aura tone="attn" />);
    const style = (container.firstElementChild as HTMLElement).style.opacity;
    expect(Number(style)).toBeCloseTo(auraField.reducedOpacity * auraField.opacity);
  });

  test('the edge glows with a pulse that reduced motion holds still', () => {
    const live = render(<Aura tone="listen" mode="edge" />);
    expect(live.container.firstElementChild?.childElementCount).toBe(1);
    live.unmount();
    useEffectsOverrides.setState({ reduceMotion: true });
    const still = render(<Aura tone="listen" mode="edge" />);
    expect(still.container.firstElementChild?.childElementCount).toBe(0);
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
