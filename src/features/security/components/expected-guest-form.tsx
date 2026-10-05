import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { ICameraCacheRow } from '@/core/interfaces';
import type { GuardEnvironment, GuardExpectedGuestCreate } from '@/core/types';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { SelectField } from '@/shared/components/ui/select-field';
import { ANY_ARRIVAL, guestArrival, guestArrivalOptions } from '@/features/security/model/guest-arrival';
import { ToggleRow } from '@/shared/components/ui/toggle-row';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { GUARD_GUEST_HOURS, GUARD_GUEST_DEFAULT_HOURS } from '@/features/security/constants';
import { useTranslation } from '@/shared/hooks/use-translation';

type ExpectedGuestFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: GuardExpectedGuestCreate) => Promise<boolean>;
  environments?: readonly GuardEnvironment[];
  cameras?: readonly ICameraCacheRow[];
  arrivalRequired?: boolean;
};

const EVERYWHERE = '0';

const DESCRIPTION_MAX = 200;

export function ExpectedGuestForm({
  open,
  onOpenChange,
  onSubmit,
  environments = [],
  cameras = [],
  arrivalRequired = false,
}: ExpectedGuestFormProps) {
  const { t } = useTranslation();
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState(String(GUARD_GUEST_DEFAULT_HOURS));
  const [oneTime, setOneTime] = useState(false);
  const [place, setPlace] = useState(EVERYWHERE);
  const [arrivalValue, setArrivalValue] = useState(ANY_ARRIVAL);
  const cameraOptions = useMemo(() => guestArrivalOptions(environments, cameras), [environments, cameras]);
  const arrivalOptions = useMemo(
    () =>
      arrivalRequired
        ? cameraOptions
        : [{ value: ANY_ARRIVAL, label: t('screens.security.guests.arrival-any') }, ...cameraOptions],
    [arrivalRequired, cameraOptions, t]
  );
  const arrival = guestArrival(arrivalValue, environments);
  const arrivalLabel = arrivalOptions.find((option) => option.value === arrivalValue)?.label ?? '';
  const placeOptions = useMemo(
    () => [
      { value: EVERYWHERE, label: t('screens.security.environments.all') },
      ...environments.map((environment) => ({ value: String(environment.id), label: environment.name })),
    ],
    [environments, t]
  );
  const [saving, setSaving] = useState(false);
  const trimmed = description.trim();
  const ready = trimmed.length > 0 && (!arrivalRequired || arrival !== null);

  const hourOptions = useMemo(
    () =>
      GUARD_GUEST_HOURS.map((value) => ({
        value: String(value),
        label: t('screens.security.guests.hours', { hours: String(value) }),
      })),
    [t]
  );

  const change = (next: boolean) => {
    if (!next) {
      setDescription('');
      setHours(String(GUARD_GUEST_DEFAULT_HOURS));
      setOneTime(false);
      setPlace(EVERYWHERE);
      setArrivalValue(ANY_ARRIVAL);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (!ready) return;
    setSaving(true);
    const scope = arrival ?? (place === EVERYWHERE ? {} : { environmentId: Number(place) });
    const saved = await onSubmit({
      description: trimmed,
      hours: Number(hours),
      oneTime,
      ...scope,
    });
    setSaving(false);
    if (saved) change(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={change}
      onSubmit={submit}
      title={t('screens.security.guests.form-title')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" onPress={() => change(false)} disabled={saving}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button onPress={submit} loading={saving} disabled={!ready}>
            <Text>{t('common.save')}</Text>
          </Button>
        </>
      }>
      <View className="gap-4">
        <View className="gap-1.5">
          <Text variant="label">{t('screens.security.guests.who')}</Text>
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder={t('screens.security.guests.who-placeholder')}
            maxLength={DESCRIPTION_MAX}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        </View>
        <View className="gap-1.5">
          <Text variant="label">{t('screens.security.guests.duration')}</Text>
          <SegmentedControl
            options={hourOptions}
            value={hours}
            onChange={setHours}
            accessibilityLabel={t('screens.security.guests.duration')}
          />
        </View>
        <View className="gap-1.5">
          <Text variant="label">{t('screens.security.guests.arrival')}</Text>
          {arrivalOptions.length > 0 ? (
            <AdaptiveSelect
              options={arrivalOptions}
              value={arrivalValue}
              onChange={setArrivalValue}
              title={t('screens.security.guests.arrival')}
              closeLabel={t('common.close')}
              searchPlaceholder={t('screens.security.guests.arrival-search')}
              emptyLabel={t('screens.security.guests.arrival-none')}
              trigger={
                <SelectField label={arrivalLabel} placeholder={t('screens.security.guests.arrival-placeholder')} />
              }
            />
          ) : (
            <Text variant="caption" className="px-1">
              {t('screens.security.guests.arrival-none')}
            </Text>
          )}
          <Text variant="caption" className="px-1">
            {t(arrivalRequired ? 'screens.security.guests.arrival-hint-required' : 'screens.security.guests.arrival-hint')}
          </Text>
        </View>
        {environments.length > 1 && arrival === null ? (
          <View className="gap-1.5">
            <Text variant="label">{t('screens.security.environments.filter')}</Text>
            <SegmentedControl
              options={placeOptions}
              value={place}
              onChange={setPlace}
              accessibilityLabel={t('screens.security.environments.filter')}
            />
          </View>
        ) : null}
        <View className="gap-1">
          <ToggleRow label={t('screens.security.guests.one-time')} value={oneTime} onChange={setOneTime} />
          <Text variant="caption" className="px-1">
            {t('screens.security.guests.one-time-hint')}
          </Text>
        </View>
      </View>
    </AdaptiveDialog>
  );
}
