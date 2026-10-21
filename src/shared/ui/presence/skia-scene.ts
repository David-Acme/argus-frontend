import {
  BlendMode,
  PaintStyle,
  Skia,
  StrokeCap,
  type SkColor,
  type SkHostRect,
  type SkImage,
  type SkPaint,
  type SkRect,
  type SkRSXform,
  type SkSurface,
} from '@shopify/react-native-skia';
import { STREAK_FIELDS, type Stroke } from './engine/types';

const PAD = 2;
const SPARKLE_STROKES = 4;

export type SkiaScene = {
  surface: SkSurface;
  pixels: number;
  ratio: number;
  sprites: SkImage | null;
  spriteRects: SkRect[];
  spriteOrigin: number;
  spriteMax: number;
  transforms: SkRSXform[];
  colors: SkColor[];
  sources: SkRect[];
  used: number;
  stroke: SkPaint;
  fill: SkPaint;
  fade: SkPaint;
  atlas: SkPaint;
  frames: [SkImage | null, SkImage | null];
  flip: number;
  tint: Float32Array;
  dot: SkHostRect;
};

export type SceneSpec = { size: number; ratio: number; count: number };

function makePaints(): Pick<SkiaScene, 'stroke' | 'fill' | 'fade' | 'atlas'> {
  'worklet';
  const stroke = Skia.Paint();
  stroke.setAntiAlias(true);
  stroke.setStyle(PaintStyle.Stroke);
  stroke.setStrokeCap(StrokeCap.Round);
  const fill = Skia.Paint();
  fill.setAntiAlias(true);
  const fade = Skia.Paint();
  fade.setBlendMode(BlendMode.DstOut);
  const atlas = Skia.Paint();
  return { stroke, fill, fade, atlas };
}

export function createScene(spec: SceneSpec): SkiaScene | null {
  'worklet';
  const pixels = Math.round(spec.size * spec.ratio);
  const surface = Skia.Surface.MakeOffscreen(pixels, pixels);
  if (!surface) return null;
  const transforms: SkRSXform[] = [];
  const colors: SkColor[] = [];
  const sources: SkRect[] = [];
  for (let i = 0; i < spec.count + SPARKLE_STROKES; i++) {
    transforms.push(Skia.RSXform(0, 0, 0, 0));
    colors.push(new Float32Array(4));
    sources.push(Skia.XYWHRect(0, 0, 0, 0));
  }
  return {
    surface,
    pixels,
    ratio: spec.ratio,
    sprites: null,
    spriteRects: [],
    spriteOrigin: 0,
    spriteMax: 0,
    transforms,
    colors,
    sources,
    used: 0,
    ...makePaints(),
    frames: [null, null],
    flip: 0,
    tint: new Float32Array(4),
    dot: Skia.XYWHRect(0, 0, 0, 0),
  };
}

export function buildSprites(scene: SkiaScene, width: number): void {
  'worklet';
  const thickness = width * scene.ratio;
  const max = Math.ceil(scene.pixels * 0.08);
  const cell = Math.ceil(thickness + PAD * 2);
  const surface = Skia.Surface.MakeOffscreen(max + cell, cell * (max + 1));
  if (!surface) return;
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeWidth(thickness);
  paint.setColor(new Float32Array([1, 1, 1, 1]));
  const origin = cell / 2;
  scene.spriteRects = [];
  for (let length = 0; length <= max; length++) {
    const top = length * cell;
    canvas.drawLine(origin, top + origin, origin + Math.max(length, 0.01), top + origin, paint);
    scene.spriteRects.push(Skia.XYWHRect(0, top, max + cell, cell));
  }
  surface.flush();
  scene.sprites = surface.makeImageSnapshot();
  scene.spriteOrigin = origin;
  scene.spriteMax = max;
}

export function beginFrame(scene: SkiaScene, fade: number): void {
  'worklet';
  const canvas = scene.surface.getCanvas();
  scene.tint.fill(0);
  scene.tint[3] = fade >= 1 ? 0 : fade;
  if (fade >= 1) {
    canvas.clear(scene.tint);
  } else if (fade > 0) {
    scene.fade.setColor(scene.tint);
    canvas.drawPaint(scene.fade);
  }
  scene.used = 0;
}

export function strokeToAtlas(scene: SkiaScene, s: Stroke): void {
  'worklet';
  const index = scene.used;
  const color = scene.colors[index];
  const ratio = scene.ratio;
  const slot: Slot = {
    x1: s.x1 * ratio,
    y1: s.y1 * ratio,
    dx: (s.x2 - s.x1) * ratio,
    dy: (s.y2 - s.y1) * ratio,
  };
  if (!color || !placeSprite(scene, index, slot)) return;
  color[0] = s.r / 255;
  color[1] = s.g / 255;
  color[2] = s.b / 255;
  color[3] = s.a;
  scene.used = index + 1;
}

type Slot = { x1: number; y1: number; dx: number; dy: number };

function placeSprite(scene: SkiaScene, index: number, slot: Slot): boolean {
  'worklet';
  const transform = scene.transforms[index];
  const span = Math.sqrt(slot.dx * slot.dx + slot.dy * slot.dy);
  const rect = scene.spriteRects[Math.min(scene.spriteMax, Math.round(span))];
  if (!transform || !rect) return false;
  const cos = span > 0 ? slot.dx / span : 1;
  const sin = span > 0 ? slot.dy / span : 0;
  const o = scene.spriteOrigin;
  scene.sources[index] = rect;
  transform.set(cos, sin, slot.x1 - (cos * o - sin * o), slot.y1 - (sin * o + cos * o));
  return true;
}

export function streaksToAtlas(scene: SkiaScene, streaks: Float32Array, count: number): void {
  'worklet';
  const ratio = scene.ratio;
  const slot: Slot = { x1: 0, y1: 0, dx: 0, dy: 0 };
  let used = 0;
  for (let i = 0; i < count; i++) {
    const o = i * STREAK_FIELDS;
    slot.x1 = (streaks[o] ?? 0) * ratio;
    slot.y1 = (streaks[o + 1] ?? 0) * ratio;
    slot.dx = (streaks[o + 2] ?? 0) * ratio - slot.x1;
    slot.dy = (streaks[o + 3] ?? 0) * ratio - slot.y1;
    const color = scene.colors[used];
    if (!color || !placeSprite(scene, used, slot)) continue;
    color[0] = (streaks[o + 4] ?? 0) / 255;
    color[1] = (streaks[o + 5] ?? 0) / 255;
    color[2] = (streaks[o + 6] ?? 0) / 255;
    color[3] = streaks[o + 7] ?? 0;
    used += 1;
  }
  scene.used = used;
}

export function flushAtlas(scene: SkiaScene, additive: boolean): void {
  'worklet';
  const { sprites, used } = scene;
  if (!sprites) return;
  for (let i = used; i < scene.transforms.length; i++) scene.transforms[i]?.set(0, 0, -100, -100);
  scene.atlas.setBlendMode(additive ? BlendMode.Plus : BlendMode.SrcOver);
  scene.surface
    .getCanvas()
    .drawAtlas(
      sprites,
      scene.sources,
      scene.transforms,
      scene.atlas,
      BlendMode.Modulate,
      scene.colors
    );
}

export function strokeToCanvas(scene: SkiaScene, s: Stroke): void {
  'worklet';
  const canvas = scene.surface.getCanvas();
  const ratio = scene.ratio;
  const color = scene.tint;
  color[0] = (s.r | 0) / 255;
  color[1] = (s.g | 0) / 255;
  color[2] = (s.b | 0) / 255;
  color[3] = s.a;
  if (!s.round) {
    scene.fill.setColor(color);
    const side = s.w * ratio;
    scene.dot.setXYWH(s.x1 * ratio - side / 2, s.y1 * ratio - side / 2, side, side);
    canvas.drawRect(scene.dot, scene.fill);
    return;
  }
  scene.stroke.setColor(color);
  scene.stroke.setStrokeWidth(s.w * ratio);
  canvas.drawLine(s.x1 * ratio, s.y1 * ratio, s.x2 * ratio, s.y2 * ratio, scene.stroke);
}

export function setCompositing(scene: SkiaScene, additive: boolean): void {
  'worklet';
  const mode = additive ? BlendMode.Plus : BlendMode.SrcOver;
  scene.stroke.setBlendMode(mode);
  scene.fill.setBlendMode(mode);
}

export function endFrame(scene: SkiaScene): SkImage {
  'worklet';
  scene.flip = 1 - scene.flip;
  const reuse = scene.frames[scene.flip];
  const image = reuse
    ? scene.surface.makeImageSnapshot(undefined, reuse)
    : scene.surface.makeImageSnapshot();
  scene.frames[scene.flip] = image;
  return image;
}

export function disposeScene(scene: SkiaScene, shown: SkImage | null): void {
  'worklet';
  scene.surface.dispose();
  scene.sprites?.dispose();
  for (const paint of [scene.stroke, scene.fill, scene.fade, scene.atlas]) paint.dispose();
  for (const frame of scene.frames) if (frame && frame !== shown) frame.dispose();
  scene.frames = [null, null];
  scene.sprites = null;
}
