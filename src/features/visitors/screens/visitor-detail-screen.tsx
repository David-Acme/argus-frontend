import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { VisitorDetail } from '@/core/types';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Panel } from '@/shared/components/ui/panel';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { VisitorFace } from '@/features/visitors/components/visitor-face';
import { VisitorProfileForm } from '@/features/visitors/components/visitor-profile-form';
import { VisitorSamplesPanel } from '@/features/visitors/components/visitor-samples-panel';
import { VisitorVisitsPanel } from '@/features/visitors/components/visitor-visits-panel';
import { VISITOR_CATEGORY_ICONS } from '@/features/visitors/constants';
import { useVisitor } from '@/features/visitors/hooks/use-visitor';
import { useVisitors } from '@/features/visitors/hooks/use-visitors';
import { hasPattern } from '@/features/visitors/model/visitor';
import { categoryLabel, patternLabel, visitorLabel, visitsLabel } from '@/features/visitors/model/visitor-label';
import type { VisitorUpdate } from '@/features/visitors/services/visitor.service';

type VisitorBodyProps = {
  visitor: VisitorDetail;
  pending: boolean;
  onSave: (update: VisitorUpdate) => void;
  onSplit: (sampleIds: number[]) => Promise<unknown>;
  onDeleteSample: (sampleId: number) => void;
};

function VisitorBody({ visitor, pending, onSave, onSplit, onDeleteSample }: VisitorBodyProps) {
  const { t } = useTranslation();
  const dates = useDateFormatter();
  const { isExpanded } = useWindowClass();
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const label = visitorLabel(visitor, t);
  const first = new Date(visitor.firstSeenAt * 1000);
  const last = new Date(visitor.lastSeenAt * 1000);

  const summary = (
    <Panel className="flex-row items-center gap-4">
      <VisitorFace
        visitorId={visitor.id}
        sampleId={visitor.coverSampleId}
        hasCrop={visitor.coverSampleId !== null}
        category={visitor.category}
        label={label}
        className="size-24 rounded-2xl"
      />
      <View className="min-w-0 flex-1 gap-1">
        <Text variant="headline" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="caption">
          {`${visitsLabel(visitor.visitCount, t)} · ${t('screens.visitors.last-seen', {
            when: `${dates.formatDayMonth(last)} ${dates.formatTime(last)}`,
          })}`}
        </Text>
        <Text variant="caption">
          {t('screens.visitors.first-seen', { when: dates.formatFullDate(first) })}
        </Text>
        <Text variant="caption" className={hasPattern(visitor.pattern) ? 'text-foreground' : undefined}>
          {patternLabel(visitor.pattern, dates.formatHour, t)}
        </Text>
        {visitor.category ? (
          <StatusBadge
            label={categoryLabel(visitor.category, t)}
            icon={VISITOR_CATEGORY_ICONS[visitor.category]}
            className={visitor.category === 'watchlist' ? 'bg-error/15 mt-1' : 'mt-1'}
            iconClassName={visitor.category === 'watchlist' ? 'text-error-strong' : undefined}
            textClassName={visitor.category === 'watchlist' ? 'text-error-strong' : undefined}
          />
        ) : null}
      </View>
    </Panel>
  );

  const form = <VisitorProfileForm key={visitor.id} visitor={visitor} saving={pending} onSave={onSave} />;
  const samples = (
    <VisitorSamplesPanel
      visitor={visitor}
      label={label}
      pending={pending}
      onSplit={onSplit}
      onDelete={onDeleteSample}
    />
  );
  const visits = <VisitorVisitsPanel visitor={visitor} cameras={cameras} className="flex-1" />;

  return isExpanded ? (
    <View className="flex-1 flex-row items-stretch gap-5">
      <View className="min-w-0 flex-1 gap-5">
        {summary}
        {form}
        {samples}
      </View>
      <View className="min-w-0 flex-1 gap-5">{visits}</View>
    </View>
  ) : (
    <View className="flex-1 gap-5">
      {summary}
      {form}
      {samples}
      {visits}
    </View>
  );
}

export default function VisitorDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const visitorId = Number(id) || 0;
  const { detail, status, pending, mutate, removeSample, split } = useVisitor(visitorId);
  const visitors = useVisitors();
  const label = detail ? visitorLabel(detail, t) : t('screens.visitors.title');

  const save = async (update: VisitorUpdate) => {
    if (!detail) return;
    const before = detail;
    mutate((previous) => (previous ? { ...previous, ...update } : previous));
    const saved = await visitors.update({ visitor: detail, update });
    mutate(() => saved ?? before);
  };

  const onSplit = async (sampleIds: number[]) => {
    const created = await split(sampleIds);
    if (created) {
      void visitors.reload();
      router.push(`/users/visitors/${created.id}`);
    }
    return created;
  };

  const remove = async () => {
    if (!detail) return;
    if (await visitors.remove(detail, label)) router.replace('/users/visitors');
  };

  return (
    <AppScreen
      scrollable={false}
      bottomNav={false}
      header={
        <ScreenHeader
          title={label}
          subtitle={t('screens.visitors.back')}
          onBack={() => router.back()}
          action={
            detail ? (
              <AdaptiveMenu
                options={[{ value: 'delete' as const, label: t('screens.visitors.delete'), icon: 'trash', destructive: true }]}
                onSelect={() => void remove()}
                title={label}
                closeLabel={t('common.close')}
                trigger={<IconButton icon="more-horizontal" label={t('screens.visitors.actions')} />}
              />
            ) : null
          }
        />
      }>
      <ScrollView className="flex-1" contentContainerClassName="grow pb-6" showsVerticalScrollIndicator={false}>
        {detail ? (
          <VisitorBody
            visitor={detail}
            pending={pending}
            onSave={(update) => void save(update)}
            onSplit={onSplit}
            onDeleteSample={(sampleId) => void removeSample(sampleId)}
          />
        ) : status === 'failed' ? (
          <EmptyState icon="scan-face" title={t('screens.visitors.detail-missing')} />
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}
