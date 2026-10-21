import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/shared/theme/tokens';
import { PresenceBench, type BenchParams } from './bench/presence-bench';
import { PresenceDemo } from './demos/presence-demo';
import { SheetDemo } from './demos/sheet-demo';
import { spikesAllowed } from './model/lab-access';

type SpikeParams = BenchParams & { view?: string };

const GUTTER = tokens.space[4];

export function SpikesScreen() {
  const params = useLocalSearchParams<SpikeParams>();
  const insets = useSafeAreaInsets();
  if (!spikesAllowed(__DEV__)) return <Redirect href="/" />;
  if (params.view === 'bench') return <PresenceBench params={params} />;
  return (
    <ScrollView
      contentContainerStyle={{
        paddingTop: insets.top + GUTTER,
        paddingBottom: insets.bottom + GUTTER,
        paddingHorizontal: GUTTER,
      }}
      testID="ui-lab-spikes">
      {params.view === 'presence' ? <PresenceDemo /> : <SheetDemo />}
    </ScrollView>
  );
}
