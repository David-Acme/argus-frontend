type AdaptiveMenuWindow = {
  isCompact: boolean;
  isExpanded: boolean;
  isNative: boolean;
  isShort: boolean;
};

/**
 * Phones need tall, edge-safe sheet targets. A tablet has enough room for an
 * anchored context menu, including when it is rotated, as long as it is not
 * the short landscape shape of a phone.
 */
export function shouldUseAdaptiveMenuSheet({
  isCompact,
  isNative,
  isShort,
}: AdaptiveMenuWindow): boolean {
  return isCompact || (isNative && isShort);
}
