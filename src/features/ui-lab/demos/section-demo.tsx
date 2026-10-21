import { Avatar } from '@/shared/ui/avatar';
import { Chip } from '@/shared/ui/chip';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

export function SectionDemo() {
  return (
    <>
      <LabCase id="grouped" block>
        <Section title={copy.house}>
          <Row
            leading={<Avatar icon="users" />}
            title={copy.people}
            meta={copy.peopleMeta}
            chevron
            onPress={noop}
          />
          <Row
            leading={<Avatar icon="face" />}
            title={copy.visitors}
            meta={copy.visitorsMeta}
            chevron
            onPress={noop}
          />
          <Row
            leading={<Avatar icon="grid" />}
            title={copy.modules}
            meta={copy.modulesMeta}
            chevron
            onPress={noop}
          />
        </Section>
      </LabCase>
      <LabCase id="action" block>
        <Section title={copy.happened} action={{ label: copy.seeAll, onPress: noop }}>
          <Row
            leading={<Avatar icon="alert" tone="attn" round />}
            title={copy.stranger}
            meta={copy.strangerMeta}
            trailing={<Chip tone="attn" label={copy.review} />}
            chevron
            onPress={noop}
          />
          <Row
            leading={<Avatar icon="user" round />}
            title={copy.luis}
            meta={copy.luisMeta}
            chevron
            onPress={noop}
          />
          <Row
            leading={<Avatar icon="eyeoff" round />}
            title={copy.covered}
            meta={copy.coveredMeta}
            chevron
            onPress={noop}
          />
        </Section>
      </LabCase>
      <LabCase id="meta" block>
        <Section title={copy.latest} meta={copy.latestMeta}>
          <Row leading={<Avatar icon="user" round />} title={copy.luis} meta={copy.luisMeta} />
          <Row
            leading={<Avatar icon="shieldok" tone="ok" round />}
            title={copy.noAlerts}
            meta={copy.noAlertsMeta}
          />
        </Section>
      </LabCase>
    </>
  );
}
