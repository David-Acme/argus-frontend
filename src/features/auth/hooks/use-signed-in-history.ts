import { useNavigation } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/core/stores';
import { withoutSignedOutHistory } from '@/features/auth/model/signed-in-history';

export function useSignedInHistory(): void {
  const navigation = useNavigation();
  const signedIn = useAuthStore((state) => state.status === 'signed-in');

  useEffect(() => {
    if (!signedIn) return;
    const prune = () => {
      const state = navigation.getState();
      const next = state ? withoutSignedOutHistory(state) : null;
      if (next) navigation.dispatch(CommonActions.reset(next));
    };
    prune();
    const unsubscribeState = navigation.addListener('state', prune);
    const unsubscribeFocus = navigation.addListener('focus', prune);
    return () => {
      unsubscribeState();
      unsubscribeFocus();
    };
  }, [navigation, signedIn]);
}
