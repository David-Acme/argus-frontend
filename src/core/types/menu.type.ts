import type { IconName } from './icon.type';

export type MenuOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  icon?: IconName;
  disabled?: boolean;
  destructive?: boolean;
};
