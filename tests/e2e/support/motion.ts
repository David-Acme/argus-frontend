export function installReducedMotion(): void {
  const query = window.matchMedia.bind(window);
  window.matchMedia = (media: string): MediaQueryList => {
    const list = query(media);
    if (media.includes('prefers-reduced-motion'))
      Object.defineProperty(list, 'matches', { value: true });
    return list;
  };
}
