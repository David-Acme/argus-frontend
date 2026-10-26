import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Notice } from '@/shared/ui/notice';
import { SkeletonRow } from '@/shared/ui/resource-view';
import { Section } from '@/shared/ui/section';
import { useCommandLauncher } from '@/features/command';
import { PanicButton } from '@/features/safety';
import type { InicioHero } from '@/features/home/hooks/use-inicio-hero';
import { InicioAlert } from './inicio-alert';
import type { FirstStep } from '@/features/home/model/inicio-states';

export type InicioLeadProps = {
  hero: InicioHero;
  firstStep: FirstStep | null;
  sos: boolean;
  band: boolean;
};

export type OfflineNoticeProps = { age: string | null };

type SpacedProps = { children: ReactNode };

type FirstStepCardProps = { step: FirstStep };

type AgendaSkeletonProps = { announced: boolean };

const ROWS = [0, 1, 2] as const;

const CAMERAS_ROUTE = '/cameras';

function FirstStepCard({ step }: FirstStepCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { openNew } = useCommandLauncher();
  if (step === 'camera')
    return (
      <Notice
        icon="cam"
        title={t('screens.home.inicio.first.camera')}
        body={t('screens.home.inicio.first.camera-body')}
        action={{
          label: t('screens.home.inicio.first.camera-action'),
          primary: true,
          onPress: () => router.push(CAMERAS_ROUTE),
        }}
      />
    );
  return (
    <Notice
      icon="bell"
      title={t('screens.home.inicio.first.reminder')}
      body={t('screens.home.inicio.first.reminder-body')}
      action={{
        label: t('screens.home.inicio.first.reminder-action'),
        primary: true,
        onPress: openNew,
      }}
    />
  );
}

function Spaced({ children }: SpacedProps) {
  return <View className="mt-section-top">{children}</View>;
}

export function OfflineNotice({ age }: OfflineNoticeProps) {
  const { t } = useTranslation();
  if (!age) return null;
  return (
    <Notice
      inline
      tone="attention"
      icon="wifioff"
      title={t('screens.home.inicio.last-known', { age })}
    />
  );
}

function AgendaSkeleton({ announced }: AgendaSkeletonProps) {
  const { t } = useTranslation();
  const rows = (
    <Section>
      {ROWS.map((row) => (
        <SkeletonRow key={row} trailing />
      ))}
    </Section>
  );
  if (!announced) return rows;
  return (
    <View role="progressbar" aria-label={t('screens.home.inicio.loading')}>
      {rows}
    </View>
  );
}

export function InicioLead({ hero, firstStep, sos, band }: InicioLeadProps) {
  return (
    <>
      {band && hero.offlineAge ? (
        <Spaced>
          <OfflineNotice age={hero.offlineAge} />
        </Spaced>
      ) : null}
      {hero.alert ? <InicioAlert response={hero.alert} /> : null}
      {sos ? (
        <Spaced>
          <PanicButton />
        </Spaced>
      ) : null}
      {hero.phase === 'loading' ? <AgendaSkeleton announced={band} /> : null}
      {firstStep && hero.phase !== 'loading' ? (
        <Spaced>
          <FirstStepCard step={firstStep} />
        </Spaced>
      ) : null}
    </>
  );
}
