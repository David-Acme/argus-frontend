export type AvatarEyeGeometry = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number;
};

/** Stable geometry for the deliberately minimal Argus blob. */
export type AvatarGeometry = {
  centerX: number;
  centerY: number;
  blobOriginY: number;
  blobPath: string;
  blobShadowPath: string;
  blobHighlightPath: string;
  eyeL: AvatarEyeGeometry;
  eyeR: AvatarEyeGeometry;
};

export function computeAvatarGeometry(): AvatarGeometry {
  return {
    centerX: 100,
    centerY: 100,
    blobOriginY: 100,
    // The neutral pose is deliberately mirrored around x=100. Expressions
    // supply the asymmetry through the eye geometry and head pose; the base
    // surface itself must never look permanently tilted to one side.
    blobPath:
      'M 96 28 C 132 25 162 42 175 69 C 184 98 174 125 148 145 C 126 159 90 166 56 160 C 29 153 18 131 21 103 C 24 74 45 48 70 36 C 80 31 90 28 96 28 Z',
    blobShadowPath:
      'M 96 32 C 132 29 162 46 175 73 C 184 102 174 129 148 149 C 126 163 90 170 56 164 C 29 157 18 135 21 107 C 24 78 45 52 70 40 C 80 35 90 32 96 32 Z',
    blobHighlightPath:
      'M 61 56 C 76 38 98 31 120 35 C 98 42 80 55 68 77 C 59 94 56 113 60 127 C 48 111 48 78 61 56 Z',
    eyeL: { cx: 80, cy: 85, rx: 6.2, ry: 15.2, rotation: 0 },
    eyeR: { cx: 120, cy: 85, rx: 6.2, ry: 15.2, rotation: 0 },
  };
}
