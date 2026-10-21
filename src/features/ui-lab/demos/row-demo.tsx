import { useState } from 'react';
import { Avatar } from '@/shared/ui/avatar';
import { Check } from '@/shared/ui/check';
import { Chip } from '@/shared/ui/chip';
import { Row } from '@/shared/ui/row';
import { Switch } from '@/shared/ui/switch';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

const noop = () => undefined;

export function RowDemo() {
  const [visitors, setVisitors] = useState(false);
  return (
    <>
      <LabCase id="navigation" block>
        <Row
          leading={<Avatar icon="users" />}
          title={copy.people}
          meta={copy.peopleMeta}
          chevron
          onPress={noop}
        />
      </LabCase>
      <LabCase id="value" block>
        <Row
          leading={<Avatar icon="sun" />}
          title={copy.appearance}
          trailing={copy.system}
          chevron
          onPress={noop}
        />
      </LabCase>
      <LabCase id="chip" block>
        <Row
          leading={<Avatar icon="alert" tone="attn" round />}
          title={copy.stranger}
          meta={copy.strangerMeta}
          trailing={<Chip tone="attn" label={copy.review} />}
          chevron
          onPress={noop}
        />
      </LabCase>
      <LabCase id="check" block>
        <Row
          leading={<Check state="overdue" label={copy.plumber} />}
          title={copy.plumber}
          meta={copy.plumberMeta}
          metaTone="alert"
          onPress={noop}
        />
      </LabCase>
      <LabCase id="done" block>
        <Row
          leading={<Check state="done" label={copy.yoga} />}
          title={copy.yoga}
          meta={copy.yogaMeta}
          struck
          onPress={noop}
        />
      </LabCase>
      <LabCase id="static" block>
        <Row leading={<Avatar icon="door" />} title={copy.doors} meta={copy.doorsMeta} />
      </LabCase>
      <LabCase id="person" block>
        <Row
          leading={<Avatar initial={copy.anaInitial} tone="accent" round />}
          title={copy.owner}
          meta={copy.ownerMeta}
          trailing={<Chip label={copy.call} />}
        />
      </LabCase>
      <LabCase id="switch" block>
        <Row
          leading={<Avatar icon="face" />}
          title={copy.visitors}
          meta={copy.visitorsMeta}
          trailing={<Switch value={visitors} label={copy.visitors} onValueChange={setVisitors} />}
        />
      </LabCase>
      <LabCase id="danger" block>
        <Row
          leading={<Avatar icon="logout" tone="alert" />}
          title={copy.logout}
          danger
          onPress={noop}
        />
      </LabCase>
    </>
  );
}
