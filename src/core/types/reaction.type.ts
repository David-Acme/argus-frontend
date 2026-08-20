/**
 * Semantic reaction the backend derives from the turn. It carries MEANING, not
 * appearance: the mapping to a calibrated avatar expression lives in
 * `reaction.constant.ts`, so the whole face can be redesigned without touching
 * the wire contract or the C++ side.
 */
export type ReactionKind =
  | 'idle'
  | 'warm'
  | 'thinking'
  | 'uncertain'
  | 'attentive'
  | 'recognizing'
  | 'curious'
  | 'acknowledging'
  | 'confused'
  | 'alarmed';
