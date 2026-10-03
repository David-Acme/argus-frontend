import { createArgusFace, type ArgusFace } from 'argus-face';

export function createFaceDetector(): ArgusFace | null {
  try {
    return createArgusFace();
  } catch {
    return null;
  }
}
