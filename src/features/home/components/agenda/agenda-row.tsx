import type { AgendaItem, AgendaMenuAction } from '@/core/types';
import { Avatar } from '@/shared/ui/avatar';
import { Check } from '@/shared/ui/check';
import { hasMenuItems, Menu } from '@/shared/ui/menu';
import type { MenuItem } from '@/shared/ui/menu';
import { Row } from '@/shared/ui/row';
import { Text, type TextTone } from '@/shared/ui/text';
import type { AgendaActions } from '@/features/home/hooks/use-agenda-actions';
import { agendaCheck, isOngoing, removeConfirm } from '@/features/agenda';
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

const TRAIL_TONE: Record<Urgency, TextTone> = { overdue: 'alert', now: 'ok', later: '3' };

function Lead({ item, wording, actions }: LeadProps) {
  if (item.kind === 'event') return <Avatar icon="cal" tone="event" size="mark" />;
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

function menuItem(
  item: AgendaItem,
  action: AgendaMenuAction,
  { actions, wording }: Pick<AgendaRowProps, 'actions' | 'wording'>
): MenuItem {
  const { t } = wording;
  const onPress = () => actions.run(item, action);
  if (action === 'edit')
    return {
      label: t('screens.home.agenda-sections.edit'),
      icon: 'pencil',
      family: 'edit',
      onPress,
    };
  return {
    label: t('screens.home.agenda-sections.delete'),
    icon: 'trash',
    destructive: true,
    confirm: removeConfirm({ entry: item.entry, t }),
    onPress,
  };
}

export function AgendaRow({ item, place, wording, actions }: AgendaRowProps) {
  const { now, t } = wording;
  const urgency = urgencyOf(item, now);
  const trail = trailOf(item, place, now);
  const items = actions.menuOf(item).map((action) => menuItem(item, action, { actions, wording }));
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
  if (!hasMenuItems(items)) return row;
  return (
    <Menu
      context
      label={t('screens.home.agenda-sections.actions', { title: item.title })}
      items={items}>
      {row}
    </Menu>
  );
}
