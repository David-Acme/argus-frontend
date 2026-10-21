import { act } from '@testing-library/react';

const HEIGHT = 800;

let width = 360;

Object.defineProperty(document.documentElement, 'clientWidth', {
  configurable: true,
  get: () => width,
});
Object.defineProperty(document.documentElement, 'clientHeight', {
  configurable: true,
  get: () => HEIGHT,
});

export function setWindowWidth(next: number): void {
  width = next;
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
}
