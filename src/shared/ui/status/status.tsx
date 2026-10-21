import { CardStatus } from './status-card';
import { HeroStatus } from './status-hero';
import type { StatusProps } from './status-types';

export function Status(props: StatusProps) {
  if (props.variant === 'card') return <CardStatus {...props} />;
  return <HeroStatus {...props} />;
}
