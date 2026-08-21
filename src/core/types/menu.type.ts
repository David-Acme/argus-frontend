import type { IconName } from './icon.type';

/** One choice of an adaptive menu or select. */
export type MenuOption<T extends string = string> = {
  value: T;
  label: string;
  /** Secondary line, shown only where there is room for it. */
  description?: string;
  icon?: IconName;
  disabled?: boolean;
  /** Renders the row in the destructive tone. */
  destructive?: boolean;
};
