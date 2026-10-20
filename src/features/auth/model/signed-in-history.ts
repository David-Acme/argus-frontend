export type HistoryRoute = { name: string; key: string };

export type HistoryState<R extends HistoryRoute = HistoryRoute> = {
  index: number;
  routes: readonly R[];
};

export const SIGNED_IN_ROUTE = '(app)';

export const SIGNED_OUT_ROUTES: readonly string[] = ['welcome', 'login'];

export function withoutSignedOutHistory<R extends HistoryRoute, S extends HistoryState<R>>(state: S): S | null {
  const focused = state.routes[state.index];
  if (!focused || focused.name !== SIGNED_IN_ROUTE) return null;
  const routes = state.routes.filter((route) => route === focused || !SIGNED_OUT_ROUTES.includes(route.name));
  if (routes.length === state.routes.length) return null;
  return { ...state, routes, index: routes.indexOf(focused) };
}
