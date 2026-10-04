type ExitListener = () => void;

export function enterWindowFullscreen(): Promise<void> {
  return Promise.resolve();
}

export function exitWindowFullscreen(): Promise<void> {
  return Promise.resolve();
}

export function onWindowFullscreenExit(_listener: ExitListener): () => void {
  return () => undefined;
}
