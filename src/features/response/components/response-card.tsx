import { useState } from 'react';
import { Linking, View } from 'react-native';
import { useAuthStore } from '@/core/stores';
import type { IconName, IncidentResponse, ResponseContact } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Text } from '@/shared/components/ui/text';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { CameraLiveView } from '@/features/cameras';
import { useResponse, useResponseVerdict } from '@/features/response/hooks/use-responses';
import {
  canDecide,
  contactsOf,
  emergencyOf,
  headlineOf,
  isOpen,
  phoneHref,
  placeOf,
  toneOf,
  type ResponseTone,
} from '@/features/response/model/response';

type ResponseCardProps = {
  responseId: number;
  compact?: boolean;
  className?: string;
};

type ResponseCardBodyProps = {
  response: IncidentResponse;
  compact: boolean;
  className?: string;
};

type ResponseCardForProps = {
  response: IncidentResponse;
  compact?: boolean;
  className?: string;
};

type ContactRowProps = {
  contact: ResponseContact;
};

const KIND_ICONS: Readonly<Record<IncidentResponse['kind'], IconName>> = {
  guard_episode: 'shield',
  guard_panic: 'siren',
  guard_duress: 'eye-off',
  guard_tamper: 'triangle-alert',
};

const KIND_KEYS = {
  guard_episode: 'episode',
  guard_panic: 'panic',
  guard_duress: 'duress',
  guard_tamper: 'tamper',
} as const satisfies Readonly<Record<IncidentResponse['kind'], string>>;

const TONE_BADGE: Readonly<Record<ResponseTone, string>> = {
  urgent: 'bg-error/15',
  confirmed: 'bg-error/15',
  attended: 'bg-accent-soft',
  resolved: 'bg-surface-secondary',
};

const TONE_GLYPH: Readonly<Record<ResponseTone, string>> = {
  urgent: 'text-error-strong',
  confirmed: 'text-error-strong',
  attended: 'text-accent-strong',
  resolved: 'text-foreground-secondary',
};

function ContactRow({ contact }: ContactRowProps) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center gap-2">
      <View className="min-w-0 flex-1">
        <Text variant="label" numberOfLines={1}>
          {contact.name}
        </Text>
        <Text variant="caption" numberOfLines={1}>
          {contact.note ? `${contact.phone} · ${contact.note}` : contact.phone}
        </Text>
      </View>
      <IconButton
        icon="phone"
        label={t('screens.response.call-contact', { name: contact.name })}
        onPress={() => void Linking.openURL(phoneHref(contact.phone, 'tel'))}
      />
      <IconButton
        icon="messages-square"
        label={t('screens.response.text-contact', { name: contact.name })}
        onPress={() => void Linking.openURL(phoneHref(contact.phone, 'sms'))}
      />
    </View>
  );
}

function ResponseCardBody({ response, compact, className }: ResponseCardBodyProps) {
  const { t } = useTranslation();
  const selfId = useAuthStore((state) => state.user?.id ?? 0);
  const decide = useResponseVerdict();
  const { cameraActions } = useCapabilities();
  const [pending, setPending] = useState<'real' | 'false_alarm' | null>(null);
  const [watching, setWatching] = useState(false);
  const headline = headlineOf(response, selfId);
  const tone = toneOf(response);
  const place = placeOf(response);
  const emergency = emergencyOf(response);
  const contacts = contactsOf(response);
  const open = isOpen(response);
  const showCamera = !compact && open && response.cameraId > 0 && cameraActions.watch;
  const headlineText = (() => {
    switch (headline.key) {
      case 'calling':
        return headline.stepCount > 1
          ? t('screens.response.headline.calling-step', {
              step: String(headline.step),
              count: String(headline.stepCount),
            })
          : t('screens.response.headline.calling');
      case 'attended':
        return t('screens.response.headline.attended', { name: headline.name });
      case 'confirmed':
        return t('screens.response.headline.confirmed', { name: headline.name });
      case 'false-alarm':
        return t('screens.response.headline.false-alarm', { name: headline.name });
      case 'confirmed-self':
        return t('screens.response.headline.confirmed-self');
      case 'false-alarm-self':
        return t('screens.response.headline.false-alarm-self');
      case 'attended-self':
        return t('screens.response.headline.attended-self');
      case 'unanswered':
        return t('screens.response.headline.unanswered');
      case 'expired':
        return t('screens.response.headline.expired');
    }
  })();

  const choose = async (verdict: 'real' | 'false_alarm') => {
    setPending(verdict);
    await decide(response, verdict);
    setPending(null);
  };

  return (
    <View
      accessibilityRole="summary"
      className={cn('bg-card gap-3 rounded-3xl p-4 shadow-md shadow-black/[0.05]', className)}>
      <View className="flex-row items-center gap-3">
        <View className={cn('size-10 items-center justify-center rounded-full', TONE_BADGE[tone])}>
          <Icon name={KIND_ICONS[response.kind]} className={cn('size-5', TONE_GLYPH[tone])} />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="label" numberOfLines={2}>
            {t(`screens.response.kind.${KIND_KEYS[response.kind]}`)}
            {place ? ` · ${place}` : ''}
          </Text>
          <Text variant="caption" numberOfLines={2} className={tone === 'urgent' ? 'text-error-strong' : undefined}>
            {headlineText}
          </Text>
        </View>
        {showCamera ? (
          <IconButton
            icon={watching ? 'eye-off' : 'video'}
            label={watching ? t('screens.response.hide-camera') : t('screens.response.show-camera')}
            onPress={() => setWatching((value) => !value)}
          />
        ) : null}
      </View>

      {showCamera && watching ? <CameraLiveView cameraId={String(response.cameraId)} quality="sub" /> : null}

      {response.mine?.discreet && open ? (
        <View className="bg-surface-secondary flex-row items-center gap-2 rounded-2xl px-3 py-2">
          <Icon name="door-open" className="text-foreground-secondary size-4" />
          <Text variant="caption" className="flex-1">
            {t('screens.response.stay-inside')}
          </Text>
        </View>
      ) : null}

      {canDecide(response, 'real') || canDecide(response, 'false_alarm') ? (
        <View className="flex-row gap-2">
          {canDecide(response, 'real') ? (
            <Button
              variant="destructive"
              className="flex-1"
              loading={pending === 'real'}
              disabled={pending !== null}
              onPress={() => void choose('real')}>
              <Text>{t('screens.response.real')}</Text>
            </Button>
          ) : null}
          {canDecide(response, 'false_alarm') ? (
            <Button
              variant="outline"
              className="flex-1"
              loading={pending === 'false_alarm'}
              disabled={pending !== null}
              onPress={() => void choose('false_alarm')}>
              <Text>{t('screens.response.false-alarm')}</Text>
            </Button>
          ) : null}
        </View>
      ) : null}

      {emergency ? (
        <Button
          variant="destructive"
          size="lg"
          accessibilityHint={t('screens.response.emergency-hint')}
          onPress={() => void Linking.openURL(phoneHref(emergency, 'tel'))}>
          <Icon name="phone-call" className="text-destructive-foreground size-5" />
          <Text>{t('screens.response.emergency', { number: emergency })}</Text>
        </Button>
      ) : null}

      {contacts.length > 0 ? (
        <View className="gap-2">
          <Text variant="micro">{t('screens.response.contacts')}</Text>
          {contacts.map((contact) => (
            <ContactRow key={`${contact.name}-${contact.phone}`} contact={contact} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function ResponseCard({ responseId, compact = false, className }: ResponseCardProps) {
  const response = useResponse(responseId);
  if (!response) return null;
  return <ResponseCardBody response={response} compact={compact} className={className} />;
}

export function ResponseCardFor({ response, compact = false, className }: ResponseCardForProps) {
  return <ResponseCardBody response={response} compact={compact} className={className} />;
}
