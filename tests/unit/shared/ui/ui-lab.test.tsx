import { describe, expect, mock, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';

let search: Record<string, string> = {};

mock.module('expo-router', () => ({
  Redirect: () => null,
  useLocalSearchParams: () => search,
  useRouter: () => ({ setParams: () => undefined }),
}));
mock.module('@/shared/hooks/use-theme-preference', () => ({ getThemePreference: () => 'system' }));

const { AuraDemo } = await import('@/features/ui-lab/demos/aura-demo');
const { AvatarDemo } = await import('@/features/ui-lab/demos/avatar-demo');
const { ButtonDemo } = await import('@/features/ui-lab/demos/button-demo');
const { CheckDemo } = await import('@/features/ui-lab/demos/check-demo');
const { ChipDemo } = await import('@/features/ui-lab/demos/chip-demo');
const { IconDemo } = await import('@/features/ui-lab/demos/icon-demo');
const { LayoutDemo } = await import('@/features/ui-lab/demos/layout-demo');
const { PressableDemo } = await import('@/features/ui-lab/demos/pressable-demo');
const { RowDemo } = await import('@/features/ui-lab/demos/row-demo');
const { SectionDemo } = await import('@/features/ui-lab/demos/section-demo');
const { StatusDemo } = await import('@/features/ui-lab/demos/status-demo');
const { SwitchDemo } = await import('@/features/ui-lab/demos/switch-demo');
const { TextDemo } = await import('@/features/ui-lab/demos/text-demo');
const { UiLabScreen } = await import('@/features/ui-lab/screens/ui-lab-screen');
const { catalogue } = await import('@/features/ui-lab/catalogue');
const { LabCase } = await import('@/features/ui-lab/components/lab-case');
const { LabPresence } = await import('@/features/ui-lab/components/lab-presence');

const DEMOS: Record<string, ComponentType> = {
  aura: AuraDemo,
  avatar: AvatarDemo,
  button: ButtonDemo,
  check: CheckDemo,
  chip: ChipDemo,
  icon: IconDemo,
  layout: LayoutDemo,
  pressable: PressableDemo,
  row: RowDemo,
  section: SectionDemo,
  status: StatusDemo,
  switch: SwitchDemo,
  text: TextDemo,
};

describe('ui-lab', () => {
  test('the catalogue lists every demo once', () => {
    expect(catalogue.map((entry) => entry.id).sort()).toEqual(Object.keys(DEMOS).sort());
  });

  for (const [id, Demo] of Object.entries(DEMOS)) {
    test(`the ${id} demo renders its cases`, () => {
      const { container } = render(<Demo />);
      expect(container.querySelectorAll('[data-testid^="case-"]').length).toBeGreaterThan(0);
    });
  }

  test('a case wraps its component in a case- test id', () => {
    render(
      <LabCase id="sample" block>
        <></>
      </LabCase>
    );
    expect(screen.getByTestId('case-sample')).toBeDefined();
  });

  test('the lab presence stands in for Presence at the size it is given', () => {
    const { container } = render(<LabPresence size={66} />);
    expect((container.firstElementChild as HTMLElement).style.width).toBe('66px');
  });

  test('the index lists the components and a parameter opens one', () => {
    (globalThis as Record<string, unknown>).__ARGUS_UI_LAB__ = true;
    search = {};
    const { unmount } = render(<UiLabScreen />);
    expect(screen.getByRole('button', { name: 'Button, button' })).toBeDefined();
    unmount();
    search = { c: 'chip', theme: 'dark' };
    render(<UiLabScreen />);
    expect(screen.getByTestId('ui-lab-stage')).toBeDefined();
  });
});
