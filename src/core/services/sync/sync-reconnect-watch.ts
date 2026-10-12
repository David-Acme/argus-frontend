import { AppState } from 'react-native';
import * as Network from 'expo-network';

let watching = false;

const reachableOf = (state: Network.NetworkStateEvent): boolean =>
  state.isConnected === true && state.isInternetReachable !== false;

export function watchReconnectOpportunities(retry: () => void): () => void {
  if (watching) return () => undefined;
  watching = true;

  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') retry();
  });

  let wasReachable: boolean | null = null;
  void Network.getNetworkStateAsync()
    .then((state) => {
      wasReachable ??= reachableOf(state);
    })
    .catch(() => undefined);
  const network = Network.addNetworkStateListener((state) => {
    const reachable = reachableOf(state);
    const returned = wasReachable === false && reachable;
    wasReachable = reachable;
    if (returned) retry();
  });

  return () => {
    watching = false;
    appState.remove();
    network.remove();
  };
}
