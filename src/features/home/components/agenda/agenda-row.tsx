import type { AgendaItem, AgendaMenuAction, TranslationKey } from '@/core/types';
import { Avatar } from '@/shared/ui/avatar';
import { Check } from '@/shared/ui/check';
import { Menu, type MenuItem } from '@/shared/ui/menu';
import { Row } from '@/shared/ui/row';
import { Text, type TextTone } from '@/shared/ui/text';
import type { AgendaActions } from '@/features/home/hooks/use-agenda-actions';
import { agendaCheck, isOngoing } from '@/features/agenda';
import {
  itemMeta,
  timeToGo,
  timeToGoText,
  urgencyOf,
  type MetaPlace,
  type Urgency,
  type WordingContext,
} from '@/features/home/model/agenda-wording';

export type AgendaRowProps = {
  item: AgendaItem;
  place: MetaPlace;
  wording: WordingContext;
  actions: AgendaActions;
};

type LeadProps = { item: AgendaItem; wording: WordingContext; actions: AgendaActions };

type TrailProps = { label: string; urgency: Urgency };

const MENU_LABEL: Record<AgendaMenuAction, TranslationKey> = {
  edit: 'screens.home.agenda-sections.edit',
  delete: 'screens.home.agenda-sections.delete',
};

const TRAIL_TONE: Record<Urgency, TextTone> = { overdue: 'alert', now: 'ok', later: '3' };

function Lead({ item, wording, actions }: LeadProps) {
  if (item.kind === 'event') return <Avatar icon="cal" tone="event" size="mark" />;
  if (item.kind === 'reminder') return <Avatar icon="bell" tone="accent" size="mark" />;
  const { t, now } = wording;
  const label = t(
    item.done ? 'screens.home.agenda-sections.reopen' : 'screens.home.agenda-sections.complete',
    { title: item.title }
  );
  const state = agendaCheck(item, now);
  if (!actions.rightsOf(item).toggle) return <Check state={state} label={label} />;
  return <Check state={state} label={label} onToggle={() => actions.toggle(item)} />;
}

function Trail({ label, urgency }: TrailProps) {
  return (
    <Text variant={urgency === 'later' ? 'sectionMeta' : 'chip'} tone={TRAIL_TONE[urgency]}>
      {label}
    </Text>
  );
}

function trailOf(item: AgendaItem, place: MetaPlace, now: number) {
  if (place === 'now') return timeToGo(item, now);
  return place === 'day' && isOngoing(item, now) ? timeToGo(item, now) : null;
}

function menuItems(item: AgendaItem, actions: AgendaActions, { t }: WordingContext): MenuItem[] {
  return actions.menuOf(item).map((action) => ({
    label: t(MENU_LABEL[action]),
    destructive: action === 'delete',
    onPress: () => actions.run(item, action),
  }));
}

export function AgendaRow({ item, place, wording, actions }: AgendaRowProps) {
  const { now, t } = wording;
  const urgency = urgencyOf(item, now);
  const trail = trailOf(item, place, now);
  const [first, second, ...rest] = menuItems(item, actions, wording);
  const row = (
    <Row
      title={item.title}
      meta={itemMeta(item, place, wording)}
      metaTone={place === 'now' && urgency === 'overdue' ? 'alert' : undefined}
      struck={item.done}
      leading={<Lead item={item} wording={wording} actions={actions} />}
      trailing={trail ? <Trail label={timeToGoText(trail, t)} urgency={urgency} /> : undefined}
      onPress={() => actions.open(item)}
      testID={`agenda-row-${item.id}`}
    />
  );
  if (!first || !second) return row;
  return (
    <Menu
      context
      label={t('screens.home.agenda-sections.actions', { title: item.title })}
      items={[first, second, ...rest]}>
      {row}
    </Menu>
  );
}
