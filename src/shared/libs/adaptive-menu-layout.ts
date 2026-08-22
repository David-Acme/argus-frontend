type AdaptiveMenuWindow = {
  isCompact: boolean;
  isExpanded: boolean;
  isNative: boolean;
  isShort: boolean;
};

/** Native touch targets use a sheet; browsers retain anchored pointer menus. */
export function shouldUseAdaptiveMenuSheet({
  isCompact,
  isNative,
}: AdaptiveMenuWindow): boolean {
  return isCompact || isNative;
}
