export function overlayBackPress(dismissible: boolean, close: () => void): boolean {
  if (dismissible) close();
  return true;
}
