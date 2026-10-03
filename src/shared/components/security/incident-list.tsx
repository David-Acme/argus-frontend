import { View } from 'react-native';
import type { GuardIncident } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { DangerBadge } from './danger-badge';

export function IncidentList({ incidents }: { incidents: GuardIncident[] }) {
  const { t } = useTranslation();
  const date = useDateFormatter();

  if (incidents.length === 0) {
    return (
      <Text variant="caption" className="px-3 py-3">
        {t('screens.security.incidents.empty')}
      </Text>
    );
  }

  return (
    <View className="gap-1">
      {incidents.map((incident, index) => {
        const at = new Date(incident.createdAt * 1000);
        return (
          <View
            key={`${incident.cameraId}-${incident.createdAt}-${index}`}
            className="flex-row items-start gap-3 rounded-2xl px-3 py-2.5">
            <View className="min-w-0 flex-1 gap-1">
              <View className="flex-row items-center justify-between gap-2">
                <Text variant="body" numberOfLines={1} className="flex-1 font-medium">
                  {incident.identity || t('screens.security.incidents.unknown')}
                </Text>
                <DangerBadge danger={incident.danger} />
              </View>
              <Text variant="caption" numberOfLines={1}>
                {incident.cameraName}
              </Text>
              <Text variant="micro">{`${date.formatDayMonth(at)} ${date.formatTime(at)}`}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
