import { act } from '@testing-library/react';

const HEIGHT = 800;

let width = 360;

let height = HEIGHT;

Object.defineProperty(document.documentElement, 'clientWidth', {
  configurable: true,
  get: () => width,
});
Object.defineProperty(document.documentElement, 'clientHeight', {
  configurable: true,
  get: () => height,
});

export function setWindowWidth(next: number): void {
  width = next;
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
}

export function setWindowSize(nextWidth: number, nextHeight: number): void {
  width = nextWidth;
  height = nextHeight;
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
}
