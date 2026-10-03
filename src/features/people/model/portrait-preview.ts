export type PortraitPreviewImage = {
  mimeType: string;
  base64: string;
};

export function portraitDataUri(image: PortraitPreviewImage): string | null {
  if (!image.mimeType.startsWith('image/') || image.base64.length === 0) return null;
  return `data:${image.mimeType};base64,${image.base64}`;
}
