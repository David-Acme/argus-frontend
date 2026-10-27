export function focusDay(container: unknown, label: string): void {
  if (typeof HTMLElement === 'undefined' || !(container instanceof HTMLElement)) return;
  const day = [...container.querySelectorAll<HTMLElement>('[role="button"]')].find(
    (node) => node.getAttribute('aria-label') === label
  );
  day?.focus();
}
