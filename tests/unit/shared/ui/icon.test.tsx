import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { Icon, ICON_SHAPES } from '@/shared/ui/icon';

describe('Icon', () => {
  test('the registry holds the prototype set of 43 glyphs', () => {
    expect(Object.keys(ICON_SHAPES)).toHaveLength(43);
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
    expect(svgs[1]?.querySelectorAll('rect')).toHaveLength(1);
    expect(svgs[0]?.getAttribute('stroke-width')).toBe('1.75');
  });

  test('is hidden from assistive tech unless it carries a label', () => {
    render(<Icon name="alert" label="Atención" />);
    expect(screen.getByRole('img', { name: 'Atención' })).toBeDefined();
  });
});
