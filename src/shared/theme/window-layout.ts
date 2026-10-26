import { breakpoints, layout, type WindowClass } from './tokens';

export type Navigation = 'bar' | 'rail' | 'sidebar';

export type WindowLayout = { windowClass: WindowClass; navigation: Navigation };

export type WindowSize = { width: number; height: number };

export type HeightClass = 'regular' | 'short' | 'tiny';

const CLASSES = Object.entries(breakpoints) as [WindowClass, number][];

export function windowClassOf(width: number): WindowClass {
  return CLASSES.reduce<WindowClass>(
    (current, [name, min]) => (width >= min ? name : current),
    'compact'
  );
}

export function classifyWindowSize({ width, height }: WindowSize): WindowLayout {
  const windowClass = windowClassOf(width);
  if (windowClass === 'compact' || height < layout.compactHeight)
    return { windowClass, navigation: 'bar' };
  return { windowClass, navigation: windowClass === 'medium' ? 'rail' : 'sidebar' };
}

export function heightClassOf(height: number): HeightClass {
  if (height < layout.tinyHeight) return 'tiny';
  return height < layout.shortHeight ? 'short' : 'regular';
}
