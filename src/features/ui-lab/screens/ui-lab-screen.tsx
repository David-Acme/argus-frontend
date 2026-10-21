import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useWindowLayout } from '@/shared/theme';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Text, TextScaleProvider } from '@/shared/ui/text';
import { catalogue, catalogueFamilies, type CatalogueEntry } from '../catalogue';
import { useLabEnvironment } from '../hooks/use-lab-environment';
import { labAllowed } from '../model/lab-access';
import { parseLabParams, type RawLabParams } from '../model/lab-params';

type LabStageProps = { entry: CatalogueEntry };

type LabIndexProps = { onOpen: (id: string) => void };

function LabStage({ entry }: LabStageProps) {
  const { Demo } = entry;
  return (
    <View className="gap-4">
      <Text variant="title" heading>
        {entry.title}
      </Text>
      <View testID="ui-lab-stage" className="gap-4">
        <Demo />
      </View>
    </View>
  );
}

function LabIndex({ onOpen }: LabIndexProps) {
  const { windowClass, navigation } = useWindowLayout();
  return (
    <View testID="ui-lab">
      <Text variant="title" heading>
        {`ui-lab · ${windowClass} · ${navigation}`}
      </Text>
      {catalogueFamilies.map((family) => {
        const entries = catalogue.filter((entry) => entry.family === family);
        if (entries.length === 0) return null;
        return (
          <Section key={family} title={family}>
            {entries.map((entry) => (
              <Row
                key={entry.id}
                title={entry.title}
                meta={entry.id}
                chevron
                onPress={() => onOpen(entry.id)}
              />
            ))}
          </Section>
        );
      })}
    </View>
  );
}

export function UiLabScreen() {
  const raw = useLocalSearchParams<RawLabParams>();
  const router = useRouter();
  const params = parseLabParams(raw);
  useLabEnvironment(params);
  if (!labAllowed(__DEV__)) return <Redirect href="/" />;
  const entry = catalogue.find((item) => item.id === params.component);
  return (
    <View className="bg-bg flex-1">
      <ScrollView>
        <View className="px-4 py-4">
          <TextScaleProvider value={params.fontScale}>
            {entry ? (
              <LabStage entry={entry} />
            ) : (
              <LabIndex onOpen={(id) => router.setParams({ c: id })} />
            )}
          </TextScaleProvider>
        </View>
      </ScrollView>
    </View>
  );
}
