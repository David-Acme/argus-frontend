export type LiveStatusSpot = 'none' | 'corner' | 'center' | 'cover';

export type LiveStatusSpotInput = {
  picture: boolean;
  live: boolean;
  compact: boolean;
  hidden: boolean;
};

export function liveStatusSpot({
  picture,
  live,
  compact,
  hidden,
}: LiveStatusSpotInput): LiveStatusSpot {
  if (!picture) return compact ? 'center' : 'cover';
  if (hidden || (compact && live)) return 'none';
  return compact ? 'center' : 'corner';
}
