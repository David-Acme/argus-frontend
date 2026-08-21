/**
 * What the focused screen tells the global bottom bar about itself. The bar
 * lives in the root layout, so the action behind its main button has to travel
 * through the navigation store instead of through props.
 */
export type BottomNavContext = {
  composeLabel: string;
  onCompose: () => void;
};
