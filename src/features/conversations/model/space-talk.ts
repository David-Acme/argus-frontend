export type SpaceKey = {
  key: string;
  repeat: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  editing: boolean;
};

const SPACE = ' ';

export function startsSpaceTalk(event: SpaceKey): boolean {
  if (event.key !== SPACE || event.repeat || event.editing) return false;
  return !event.ctrlKey && !event.metaKey && !event.altKey;
}

export function endsSpaceTalk(event: Pick<SpaceKey, 'key'>, holding: boolean): boolean {
  return holding && event.key === SPACE;
}
