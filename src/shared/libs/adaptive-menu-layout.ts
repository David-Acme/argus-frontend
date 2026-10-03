type AdaptiveMenuWindow = {
  isCompact: boolean;
  isExpanded: boolean;
  isNative: boolean;
  isShort: boolean;
};

export function shouldUseAdaptiveMenuSheet({
  isCompact,
  isNative,
  isShort,
}: AdaptiveMenuWindow): boolean {
  return isCompact || (isNative && isShort);
}
