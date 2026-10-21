import { View } from 'react-native';
import { size } from '@/shared/theme';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Row } from '@/shared/ui/row';
import { Screen, ScreenColumn, ScreenColumns } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { Status, type StatusStat } from '@/shared/ui/status';
import { LabCase } from '../components/lab-case';
import { labPresence } from '../components/lab-presence';
import { copy } from './demo-copy';

const noop = () => undefined;

const FRAME = { height: size.previewPhone };

const STATS: readonly StatusStat[] = [
  { icon: 'cam', value: '5', label: copy.cameras },
  { icon: 'shieldok', value: '0', label: copy.alertsToday },
  { icon: 'hist', value: '4', label: copy.detections },
];

const search = <Button iconOnly glass icon="search" label={copy.search} onPress={noop} />;

function Now() {
  return (
    <Section title={copy.now} action={{ label: copy.nowMeta, onPress: noop }}>
      <Row title={copy.plumber} meta={copy.plumberMeta} metaTone="alert" />
      <Row title={copy.light} meta={copy.lightMeta} />
      <Row title={copy.yoga} meta={copy.yogaMeta} />
    </Section>
  );
}

function News() {
  return (
    <Section title={copy.newsTitle} action={{ label: copy.seeAll, onPress: noop }}>
      <Row leading={<Avatar icon="user" round />} title={copy.luis} meta={copy.luisMeta} />
      <Row leading={<Avatar icon="eyeoff" round />} title={copy.covered} meta={copy.coveredMeta} />
    </Section>
  );
}

function Home({ updating }: { updating?: boolean }) {
  return (
    <Screen
      aura="calm"
      meta={copy.greeting}
      updating={updating ? copy.updating : undefined}
      actions={search}>
      <Status
        tone="calm"
        sentence={copy.hero}
        meta={copy.heroMeta}
        stats={STATS}
        presence={labPresence}
      />
      <Now />
      <News />
    </Screen>
  );
}

export function ScreenDemo() {
  return (
    <>
      <LabCase id="inicio" block>
        <View className="overflow-hidden" style={FRAME}>
          <Home />
        </View>
      </LabCase>
      <LabCase id="updating" block>
        <View className="overflow-hidden" style={FRAME}>
          <Home updating />
        </View>
      </LabCase>
      <LabCase id="detail" block>
        <View className="overflow-hidden" style={FRAME}>
          <Screen
            title={copy.security}
            back={{ label: copy.back, onPress: noop }}
            actions={<Button variant="danger" compact label={copy.sos} onPress={noop} />}>
            <Now />
          </Screen>
        </View>
      </LabCase>
      <LabCase id="columns" block>
        <View className="overflow-hidden" style={FRAME}>
          <Screen aura="calm" columns>
            <ScreenColumns>
              <ScreenColumn width={size.columnSide}>
                <Now />
              </ScreenColumn>
              <ScreenColumn>
                <News />
                <News />
              </ScreenColumn>
            </ScreenColumns>
          </Screen>
        </View>
      </LabCase>
    </>
  );
}
