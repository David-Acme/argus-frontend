import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/shared/theme/tokens';
import { PresenceBench, type BenchParams } from './bench/presence-bench';
import { PresenceDemo } from './demos/presence-demo';
import { SheetDemo } from './demos/sheet-demo';

type SpikeParams = BenchParams & { view?: string };

const GUTTER = tokens.space[4];
const LAB_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_ARGUS_LAB === '1';

export function SpikesScreen() {
  const params = useLocalSearchParams<SpikeParams>();
  const insets = useSafeAreaInsets();
  if (!LAB_ENABLED) return <Redirect href="/" />;
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
