import { View } from 'react-native';
import type { AgendaItem, TranslateFn } from '@/core/types';
import { recurrenceLabel } from '@/shared/libs/recurrence';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Chip } from '@/shared/ui/chip';
import type { IconGlyph } from '@/shared/ui/icon';
import { Menu } from '@/shared/ui/menu';
import type { MenuItem } from '@/shared/ui/menu';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Text } from '@/shared/ui/text';
import type { DayGroup } from '@/features/agenda/model/agenda-days';
import { categoryOf, kindWords, lineWords } from '@/features/agenda/model/agenda-lines';
import { NextDays } from '@/features/agenda/components/agenda-guide';
import type { DetailHandlers, ListContext } from '@/features/agenda/model/agenda-view';

export type ItemDetailProps = {
  item: AgendaItem;
  rest: readonly AgendaItem[];
  upcoming: readonly DayGroup[];
  context: ListContext;
  handlers: DetailHandlers;
  titled?: boolean;
};

type PartProps = { item: AgendaItem; context: ListContext; handlers: DetailHandlers };

type RestProps = { items: readonly AgendaItem[]; context: ListContext };

type Fact = { key: string; icon?: IconGlyph; title: string; meta: string };

const ownerName = (item: AgendaItem, { owners }: ListContext): string | null =>
  item.origin.kind === 'entry' ? (owners.get(item.origin.entry.ownerId ?? '') ?? null) : null;

function moreItems({ item, context, handlers }: PartProps): MenuItem[] {
  const { actions, now, t } = context;
  const [, ...later] = actions.snoozesOf(item, now);
  const items: MenuItem[] = later.map((action) => ({
    label: t('screens.agenda.detail.snooze-tomorrow'),
    icon: 'clock',
    onPress: () => actions.snooze(item, action),
  }));
  if (actions.canSkip(item))
    items.push({ label: t('screens.agenda.detail.skip'), onPress: () => actions.skip(item) });
  if (handlers.onShare)
    items.push({
      label: t('screens.agenda.share'),
      icon: 'users',
      onPress: () => handlers.onShare?.(item),
    });
  if (actions.rightsOf(item).remove)
    items.push({
      label: t('screens.agenda.detail.delete'),
      destructive: true,
      onPress: () => actions.remove(item),
    });
  return items;
}

function More(part: PartProps) {
  const { t } = part.context;
  const [first, second, ...rest] = moreItems(part);
  if (first && second)
    return <Menu label={t('screens.agenda.detail.more')} items={[first, second, ...rest]} />;
  if (!first) return null;
  return (
    <Button
      label={first.label}
      onPress={first.onPress}
      variant={first.destructive ? 'danger' : 'secondary'}
      compact
    />
  );
}

function Actions(part: PartProps) {
  const { item, context, handlers } = part;
  const { actions, now, t } = context;
  const [snooze] = actions.snoozesOf(item, now);
  const edit = handlers.onEdit;
  return (
    <View className="flex-row flex-wrap items-center gap-2">
      {edit && actions.rightsOf(item).edit ? (
        <Button
          label={t('screens.agenda.detail.edit')}
          onPress={() => edit(item)}
          variant="primary"
          compact
        />
      ) : null}
      {snooze ? (
        <Button
          label={t('screens.agenda.detail.snooze')}
          onPress={() => actions.snooze(item, snooze)}
          compact
        />
      ) : null}
      <More {...part} />
    </View>
  );
}

function factRows(item: AgendaItem, context: ListContext, t: TranslateFn): Fact[] {
  const repeat = recurrenceLabel(item.repeat, t);
  const owner = categoryOf(item, context.viewer) === 'shared' ? ownerName(item, context) : null;
  const notes =
    item.origin.kind === 'reminder' ? item.origin.row.description : item.origin.entry.description;
  const rows: (Fact | null)[] = [
    item.place
      ? { key: 'place', icon: 'pin', title: item.place, meta: t('screens.agenda.detail.place') }
      : null,
    repeat
      ? { key: 'repeat', icon: 'repeat', title: repeat, meta: t('screens.agenda.detail.repeat') }
      : null,
    item.project
      ? {
          key: 'project',
          icon: 'check',
          title: item.project,
          meta: t('screens.agenda.detail.project'),
        }
      : null,
    owner
      ? {
          key: 'owner',
          icon: 'users',
          title: t('screens.agenda.detail.shared-by', { name: owner }),
          meta: t('screens.agenda.detail.shared-body'),
        }
      : null,
    notes ? { key: 'notes', title: notes, meta: t('screens.agenda.detail.notes') } : null,
  ];
  return rows.filter((row) => row !== null);
}

function RestOfDay({ items, context }: RestProps) {
  const { t } = context;
  if (items.length === 0) return null;
  return (
    <Section title={t('screens.agenda.detail.rest-of-day')} meta={String(items.length)}>
      {items.map((other) => {
        const words = lineWords(other, context);
        return (
          <Row
            key={other.id}
            title={other.title}
            meta={[words.time, words.state].filter(Boolean).join(' · ')}
            onPress={() => context.onOpen(other)}
          />
        );
      })}
    </Section>
  );
}

export function ItemDetail({
  item,
  rest,
  upcoming,
  context,
  handlers,
  titled = true,
}: ItemDetailProps) {
  const { t } = context;
  const words = lineWords(item, context);
  const facts = factRows(item, context, t);
  return (
    <View>
      <View className="gap-3 pt-6">
        {titled ? <Chip label={kindWords(item, context)} /> : null}
        {titled ? (
          <Text variant="title" heading={2} struck={item.done}>
            {item.title}
          </Text>
        ) : null}
        <Text variant="body" tone="2">
          {[words.time, words.state, words.meta].filter(Boolean).join(' · ')}
        </Text>
        <Actions item={item} context={context} handlers={handlers} />
      </View>
      {facts.length > 0 ? (
        <Section>
          {facts.map((fact) => (
            <Row
              key={fact.key}
              leading={fact.icon ? <Avatar icon={fact.icon} /> : undefined}
              title={fact.title}
              meta={fact.meta}
            />
          ))}
        </Section>
      ) : null}
      <NextDays groups={upcoming} context={context} />
      <RestOfDay items={rest} context={context} />
    </View>
  );
}
