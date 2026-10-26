import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import type { IncidentResponse } from '@/core/types';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cameraPrivacyMasked } from '@/shared/libs/camera-privacy';
import { Button } from '@/shared/ui/button';
import { Media } from '@/shared/ui/media';
import { Row } from '@/shared/ui/row';
import { Section } from '@/shared/ui/section';
import { Status, type StatusAction } from '@/shared/ui/status';
import { CameraLiveView, useCameraPrivacy } from '@/features/cameras';
import {
  alertPlaceOf,
  canDecide,
  contactsOf,
  emergencyOf,
  phoneHref,
  useResponseVerdict,
} from '@/features/response';

export type InicioAlertProps = { response: IncidentResponse };

type AlertMediaProps = { response: IncidentResponse };

const call = (phone: string) => void Linking.openURL(phoneHref(phone, 'tel'));

function AlertMedia({ response }: AlertMediaProps) {
  const { t } = useTranslation();
  const privacy = useCameraPrivacy(response.cameraId);
  return (
    <Media name={alertPlaceOf(response) ?? undefined} live={t('screens.response.alert.live')}>
      <CameraLiveView
        cameraId={String(response.cameraId)}
        quality="sub"
        privacy={cameraPrivacyMasked(privacy)}
        fill
      />
    </Media>
  );
}

function Contacts({ response }: AlertMediaProps) {
  const { t } = useTranslation();
  const contacts = contactsOf(response);
  if (contacts.length === 0) return null;
  return (
    <Section title={t('screens.response.contacts')}>
      {contacts.map((contact) => (
        <Row
          key={`${contact.name}-${contact.phone}`}
          title={contact.name}
          meta={contact.note ? `${contact.phone} · ${contact.note}` : contact.phone}
          trailing={
            <Button
              iconOnly
              icon="phone"
              label={t('screens.response.call-contact', { name: contact.name })}
              onPress={() => call(contact.phone)}
            />
          }
        />
      ))}
    </Section>
  );
}

export function InicioAlert({ response }: InicioAlertProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const decide = useResponseVerdict();
  const { cameraActions } = useCapabilities();
  const watches = cameraActions.watch && response.cameraId > 0;
  const emergency = emergencyOf(response);
  const primary: StatusAction = watches
    ? {
        label: t('screens.response.alert.see-camera'),
        onPress: () => router.push(`/cameras/${response.cameraId}`),
      }
    : { label: t('screens.response.alert.see-security'), onPress: () => router.push('/security') };
  const real: StatusAction | undefined = canDecide(response, 'real')
    ? { label: t('screens.response.real'), onPress: () => decide(response, 'real') }
    : undefined;
  const dial: StatusAction | undefined = emergency
    ? {
        label: t('screens.response.emergency', { number: emergency }),
        onPress: () => call(emergency),
      }
    : undefined;
  const falseAlarm: StatusAction | undefined = canDecide(response, 'false_alarm')
    ? {
        label: t('screens.response.alert.is-false'),
        onPress: () => decide(response, 'false_alarm'),
      }
    : undefined;

  return (
    <>
      <Status
        variant="card"
        tone="alert"
        media={watches ? <AlertMedia response={response} /> : undefined}
        primary={primary}
        secondaryAction={real ?? dial}
        tertiary={falseAlarm}
      />
      <Contacts response={response} />
    </>
  );
}
