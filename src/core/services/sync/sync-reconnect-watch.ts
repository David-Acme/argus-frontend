import { AppState } from 'react-native';
import * as Network from 'expo-network';

let watching = false;

const reachableOf = (state: Network.NetworkStateEvent): boolean =>
  state.isConnected === true;

export function watchReconnectOpportunities(retry: () => void): () => void {
  if (watching) return () => undefined;
  watching = true;

  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') retry();
  });

  let wasReachable: boolean | null = null;
  let lastType: Network.NetworkStateType | undefined;
  void Network.getNetworkStateAsync()
    .then((state) => {
      wasReachable ??= reachableOf(state);
      lastType ??= state.type;
    })
    .catch(() => undefined);
  const network = Network.addNetworkStateListener((state) => {
    const reachable = reachableOf(state);
    const returned =
      (wasReachable === false && reachable) ||
      (reachable &&
        lastType !== undefined &&
        state.type !== undefined &&
        state.type !== lastType);
    wasReachable = reachable;
    lastType = state.type;
    if (returned) retry();
  });

  return () => {
    watching = false;
    appState.remove();
    network.remove();
  };
}
