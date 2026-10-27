import { Avatar } from '@/shared/ui/avatar';
import {
  ResourceView,
  SkeletonRow,
  Skeleton,
  type Resource,
  type ResourceCopy,
} from '@/shared/ui/resource-view';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { LabCase } from '../components/lab-case';
import { copy } from './demo-copy';

type Latest = readonly { title: string; meta: string; icon: 'user' | 'shieldok' }[];

const noop = () => undefined;

const LATEST: Latest = [
  { title: copy.luis, meta: copy.luisMeta, icon: 'user' },
  { title: copy.noAlerts, meta: copy.noAlertsMeta, icon: 'shieldok' },
];

const COPY: ResourceCopy = {
  loading: copy.loading,
  retry: copy.retry,
  failed: { title: copy.offline, body: copy.checkWifi },
  stale: (age) => `${copy.staleNotice} ${age}.`,
  refused: (owner) => `${copy.agendaOff} ${owner} ${copy.agendaOffEnd}`,
};

const EMPTY = {
  message: copy.nothingToday,
  detail: copy.freeDay,
  action: { label: copy.newReminder, onPress: noop, icon: 'plus' },
  presence: 'happy',
} as const;

const SKELETON = (
  <>
    <Section>
      {[0, 1, 2, 3].map((index) => (
        <SkeletonRow key={index} trailing />
      ))}
    </Section>
    <Section>
      {[0, 1].map((index) => (
        <SkeletonRow key={index} short />
      ))}
    </Section>
    <Skeleton shape="button" />
  </>
);

const STATES: Record<string, Resource<Latest>> = {
  loading: { status: 'loading' },
  ready: { status: 'ready', data: LATEST },
  empty: { status: 'empty' },
  stale: { status: 'stale', data: LATEST, age: copy.staleAge },
  failed: { status: 'failed', retry: noop },
  refused: { status: 'refused', owner: copy.theOwner },
};

function LatestRows({ rows }: { rows: Latest }) {
  return (
    <Section title={copy.latest} meta={copy.latestMeta}>
      {rows.map((row) => (
        <Row
          key={row.title}
          leading={
            <Avatar icon={row.icon} tone={row.icon === 'shieldok' ? 'ok' : 'default'} round />
          }
          title={row.title}
          meta={row.meta}
        />
      ))}
    </Section>
  );
}

export function ResourceViewDemo() {
  return (
    <>
      {Object.entries(STATES).map(([id, resource]) => (
        <LabCase key={id} id={id} block>
          <ResourceView resource={resource} copy={COPY} skeleton={SKELETON} empty={EMPTY}>
            {(rows) => <LatestRows rows={rows} />}
          </ResourceView>
        </LabCase>
      ))}
    </>
  );
}
