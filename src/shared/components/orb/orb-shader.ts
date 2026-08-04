import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

export type OrbUniforms = {
  u_resolution: [number, number];
  u_time: number;
  u_phase: number;
  u_intensity: number;
  u_audio: number;
  u_jump: number;
  u_wobble: number;
  u_brightness: number;
  u_pulse: number;
  u_spread: number;
  u_tint: number;
  u_hue: number;
  u_sat: number;
  u_val: number;
  u_hueAlt: number;
};

/**
 * Procedural "energy ring" orb (SkSL).
 *
 * - **Silhouette**: a glowing annulus whose radius is modulated by value noise
 *   sampled *on a circle* (`vec2(cos a, sin a)`), so the deformation is
 *   seamless by construction — no visible joint at angle 0. The shape is
 *   deliberately **stable**: audio barely touches it.
 * - **Band profile**: flat-topped, not a bare gaussian. A solid plateau
 *   (`HW_IN`..`HW_OUT`) gives the ring real, readable thickness and gaussian
 *   skirts keep both edges soft. A plain gaussian has no solid core — only
 *   falloff — which is what made the orb read as out of focus at device
 *   resolution. The skirts are asymmetric (outer ~2.5x wider) so the hollow
 *   stays clean while the outside melts into air.
 * - **No hard edges anywhere.** Deliberately *no* thin hot core line: any sharp
 *   gaussian reads as a drawn "guide" outline and kills the floating feel.
 * - **Voice = `u_jump`, not deformation.** A sprung radius pop (driven by onset
 *   detection on the UI thread) makes the orb bounce to the beat while keeping
 *   its shape and rotation. Coupling audio to the wobble instead made it churn
 *   into a different blob on every syllable.
 * - **Wind**: the shape drifts on a slow Lissajous float, the wobble noise
 *   evolves on its own time base (independent of rotation, so it keeps breathing
 *   even when the orb is idle and barely spinning) and the radius breathes.
 * - **Palette**: an *analogous* hue sweep around the annulus, anchored on the
 *   theme `accent` token (`u_hue`/`u_sat`/`u_val` are that token in HSV) and
 *   widened by `u_spread`. Two harmonics of the angle keep it seamless.
 * - `u_tint` bends the whole sweep toward `u_hueAlt` (the `error` token).
 * - `u_pulse` is the "thinking" comet head sweeping around the ring.
 * - `u_phase` is **integrated on the UI thread** (`useFrameCallback`) so the
 *   rotation physically accelerates with the voice instead of snapping speeds.
 * - Output is **premultiplied alpha** (color × coverage, coverage) and fully
 *   transparent outside the aura, so the orb floats on any background.
 *
 * Cost: 3 value-noise evaluations + 2 `exp` per pixel — deliberately cheap for
 * low-end Android GPUs.
 */
export const ORB_SKSL = `
uniform float2 u_resolution;
uniform float u_time;
uniform float u_phase;
uniform float u_intensity;
uniform float u_audio;
uniform float u_jump;
uniform float u_wobble;
uniform float u_brightness;
uniform float u_pulse;
uniform float u_spread;
uniform float u_tint;
uniform float u_hue;
uniform float u_sat;
uniform float u_val;
uniform float u_hueAlt;

const float BASE_R = 0.245; // ring radius in normalized units (min side = 1)
const float HW_IN = 0.016;  // solid plateau half-width, inner side
const float HW_OUT = 0.020; // solid plateau half-width, outer side

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(vec3(c.x) + vec3(1.0, 0.6666667, 0.3333333)) * 6.0 - vec3(3.0));
  return c.z * mix(vec3(1.0), clamp(p - vec3(1.0), 0.0, 1.0), c.y);
}

vec4 main(vec2 xy) {
  vec2 p = (xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  float t = u_time / 1000.0;
  float audio = clamp(u_audio, 0.0, 1.0);
  float energy = clamp(u_intensity + audio * 0.75, 0.0, 1.0);

  // --- Wind: a slow Lissajous drift on both axes. Incommensurate frequencies
  // keep it from ever looking like it loops, so the orb reads as suspended in
  // air rather than pinned to the center. ---
  p.x -= sin(t * 0.23) * 0.011 + sin(t * 0.41 + 1.7) * 0.005;
  p.y -= cos(t * 0.19) * 0.013 + sin(t * 0.37 + 0.6) * 0.004;

  float r = length(p);
  float a = atan(p.y, p.x);

  // --- Rotating frame. EVERY angular feature (lobes, luminance, hue) is sampled
  // at ra, so the whole pattern physically orbits the center. Offsetting the
  // noise coordinates by u_phase instead would only *translate* the noise field,
  // which morphs the shape but never reads as rotation. ---
  float ra = a - u_phase;
  vec2 cp = vec2(cos(ra), sin(ra));

  // --- Seamless silhouette wobble (noise sampled on a circle). Frequencies are
  // deliberately low: sampling the value-noise lattice too densely around the
  // circle makes the outline crinkle instead of forming smooth rounded lobes.
  // Each octave also drifts on its own time base, independent of u_phase, so the
  // outline keeps billowing even when the orb is idle and barely rotating. ---
  float n1 = noise(cp * 1.7 + vec2(t * 0.085, -t * 0.062));
  float n2 = noise(cp * 3.1 - vec2(t * 0.047, -t * 0.073));
  float wob = (n1 - 0.5) * 0.85 + (n2 - 0.5) * 0.28;

  // The silhouette is deliberately STABLE: audio barely touches it. Voice is
  // expressed as u_jump (a sprung radius pop) so the orb keeps its shape and
  // rotates while it bounces, instead of churning into a different blob.
  float amp = u_wobble * (0.010 + audio * 0.008);
  float breathe = 1.0 + sin(t * 0.55) * 0.010 + sin(t * 0.31 + 2.1) * 0.006;
  float ringR = (BASE_R + u_intensity * 0.008 + u_jump * 0.075 + wob * amp) * breathe;

  float d = r - ringR;

  // --- Luminance texture along the ring + "thinking" comet head. The comet is
  // offset by an extra u_phase so it overtakes the ring instead of riding it. ---
  float tex = noise(cp * 3.1 + vec2(-t * 0.05, t * 0.036));
  float lum = 0.82 + 0.42 * tex;
  float head = 0.5 + 0.5 * cos(ra - u_phase * 1.6);
  lum *= 1.0 + u_pulse * 0.85 * pow(head, 6.0);

  // --- Analogous hue sweep anchored on the accent token. The sweep is biased
  // negative so it travels toward copper/rose (warmer) instead of drifting up
  // into yellow-green, which would break the warm-neutral design language. ---
  float sweep = 0.72 * sin(ra) + 0.28 * sin(2.0 * ra);
  float hue = mix(u_hue + u_spread * (sweep * 0.55 - 0.32), u_hueAlt, u_tint);
  float sat = u_sat * (0.55 + 0.60 * (0.5 + 0.5 * cos(ra)));
  sat = clamp(sat * (1.0 - u_tint * 0.1), 0.0, 1.0);
  vec3 col = hsv2rgb(vec3(fract(hue), sat, u_val));

  // --- Band: a FLAT-TOPPED profile, not a bare gaussian. The plateau
  // (HW_IN..HW_OUT) gives the ring a real, readable thickness and the gaussian
  // skirts keep both edges soft. A plain gaussian of the same total width is
  // what made the orb look out of focus at device resolution: it has no solid
  // core, only falloff. Asymmetric skirts keep the hollow clean while the
  // outside melts into air. ---
  float dIn = max(-d - HW_IN, 0.0);
  float dOut = max(d - HW_OUT, 0.0);
  float wIn = 0.000110 + energy * 0.000060;
  float wOut = wIn * 2.5;
  float glow = exp(-(dIn * dIn) / wIn - (dOut * dOut) / wOut);

  // Faint outer halo. Kept weak and tight on purpose: a wide, heavy version of
  // this term is what smeared the orb into smoke. Gated with a smooth ramp
  // rather than dOut, which is zero across the whole interior and would flood
  // the hollow with haze.
  float haze = exp(-(d * d) / (0.0012 + energy * 0.0015)) * smoothstep(-0.010, 0.045, d);

  float bright = u_brightness * (0.62 + 0.55 * energy) * (1.0 + u_jump * 0.5);

  // Color stays pure; ALL intensity variation lives in the coverage. Modulating
  // the color by lum instead would paint the angular noise into the hollow
  // center as dark petals.
  //
  // Coverage is deliberately kept below 1.0: if it saturates, the gaussian
  // flattens into a plateau and the hole gains a hard rim — the exact "guide
  // line" look the soft bloom is there to avoid.
  float cover = clamp((glow * lum * 1.05 + haze * 0.10) * bright, 0.0, 0.97);

  return vec4(clamp(col, 0.0, 1.0) * cover, cover);
}
`;

export function compileOrbShader(): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(ORB_SKSL);
  if (!effect) {
    throw new Error('Could not compile the orb shader.');
  }
  return effect;
}
