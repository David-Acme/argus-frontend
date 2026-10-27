import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Icon } from '@/shared/ui/icon/icon';
import { ICON_SHAPES } from '@/shared/ui/icon/icon-shapes';

describe('Icon', () => {
  test('the registry holds the prototype set of 43 glyphs and the ones the calls, the live camera, Tú, Ajustes, the agenda, the first run and the action menus added', () => {
    expect(Object.keys(ICON_SHAPES)).toHaveLength(66);
  });

  test('draws every shape of the glyph at 20 or 24 with the 1.75 stroke', () => {
    const { container } = render(
      <>
        <Icon name="home" />
        <Icon name="cal" size="small" />
      </>
    );
    const svgs = container.querySelectorAll('svg');
    expect(svgs[0]?.getAttribute('width')).toBe('24');
    expect(svgs[1]?.getAttribute('width')).toBe('20');
    expect(svgs[0]?.querySelectorAll('path')).toHaveLength(3);
    expect(svgs[1]?.querySelectorAll('path')).toHaveLength(2);
    expect(svgs[0]?.getAttribute('stroke-width')).toBe('1.75');
  });

  test('draws the large glyph of the hold-to-talk button at 34', () => {
    const { container } = render(<Icon name="mic" size="large" />);
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('34');
  });

  test('is hidden from assistive tech unless it carries a label', () => {
    render(<Icon name="alert" label="Atención" />);
    expect(screen.getByRole('img', { name: 'Atención' })).toBeDefined();
  });
});
