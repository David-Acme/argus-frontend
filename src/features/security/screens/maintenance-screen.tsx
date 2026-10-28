import { useState } from 'react';
import type { ICameraCacheRow } from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import type { MaintenanceWindow, TranslationKey } from '@/core/types';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Avatar } from '@/shared/ui/avatar';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { Row } from '@/shared/ui/row';
import { Screen } from '@/shared/ui/screen';
import { Section } from '@/shared/ui/section';
import { Status } from '@/shared/ui/status';
import { MaintenanceDialog } from '@/features/security/components/maintenance-dialog';
import { useBack } from '@/features/security/hooks/use-back';
import { useGuardEnvironments } from '@/features/security/hooks/use-guard';
import {
  useMaintenance,
  type MaintenanceControls,
} from '@/features/security/hooks/use-maintenance';
import { useMomentFormat } from '@/features/security/hooks/use-moment-format';
import { cameraNames, minutesLeft, pendingChecks } from '@/features/security/model/maintenance';

type WindowRowProps = {
  window: MaintenanceWindow;
  names: ReadonlyMap<number, string>;
  now: number;
  onEnd: (window: MaintenanceWindow) => Promise<boolean>;
};

type ViewChecksProps = {
  windows: readonly MaintenanceWindow[];
  selfId: number;
  onAnswer: MaintenanceControls['answerView'];
};

const MINUTE_MS = 60_000;

const END_REASON: Readonly<Record<NonNullable<MaintenanceWindow['endReason']>, TranslationKey>> = {
  done: 'screens.security.maintenance.end-reason.done',
  expired: 'screens.security.maintenance.end-reason.expired',
  unknown_person: 'screens.security.maintenance.end-reason.unknown-person',
  replaced: 'screens.security.maintenance.end-reason.replaced',
};

function WindowRow({ window, names, now, onEnd }: WindowRowProps) {
  const { t } = useTranslation();
  const format = useMomentFormat();
  const status = window.active
    ? t('screens.security.maintenance.active-until', {
        time: format.time(new Date(window.endsAt * 1000)),
        minutes: String(minutesLeft(window, Math.floor(now / 1000))),
      })
    : t(window.endReason ? END_REASON[window.endReason] : END_REASON.done);
  return (
    <Row
      leading={<Avatar icon="wrench" tone={window.active ? 'accent' : 'default'} />}
      title={cameraNames(window, names).join(', ')}
      meta={[
        t('screens.security.maintenance.by', { name: window.declaredByName }),
        status,
        window.duress ? t('screens.security.maintenance.duress') : null,
      ]
        .filter(Boolean)
        .join(' · ')}
      metaTone={window.duress ? 'alert' : undefined}
      trailing={
        window.active ? (
          <Button
            compact
            label={t('screens.security.maintenance.done')}
            onPress={() => onEnd(window)}
          />
        ) : undefined
      }
    />
  );
}

function ViewChecks({ windows, selfId, onAnswer }: ViewChecksProps) {
  const { t } = useTranslation();
  const checks = windows.flatMap((window) =>
    pendingChecks(window, selfId).map((check) => ({ window, check }))
  );
  return checks.map(({ window, check }) => (
    <Status
      key={`${window.id}-${check.cameraId}`}
      variant="card"
      tone="attention"
      sentence={t('screens.security.maintenance.view-question', { name: check.cameraName })}
      primary={{
        label: t('screens.security.maintenance.view-yes'),
        onPress: () => onAnswer(window, check.cameraId, true),
      }}
      secondaryAction={{
        label: t('screens.security.maintenance.view-no'),
        onPress: () => onAnswer(window, check.cameraId, false),
      }}
    />
  ));
}

export default function MaintenanceScreen() {
  const { t } = useTranslation();
  const back = useBack();
  const now = useNow(MINUTE_MS);
  const { guard } = useCapabilities();
  const selfId = useAuthStore((state) => Number(state.user?.id ?? 0));
  const maintenance = useMaintenance(guard.maintenance);
  const environments = useGuardEnvironments(guard.maintenance).data ?? [];
  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const names = new Map(cameras.map((camera) => [Number(camera.id), camera.name]));
  const [declaring, setDeclaring] = useState(false);
  return (
    <>
      <Screen
        title={t('screens.security.maintenance.title')}
        back={back}
        actions={
          <Button
            iconOnly
            glass
            icon="plus"
            label={t('screens.security.maintenance.declare')}
            onPress={() => setDeclaring(true)}
          />
        }>
        <ViewChecks
          windows={maintenance.windows}
          selfId={selfId}
          onAnswer={maintenance.answerView}
        />
        {maintenance.windows.length === 0 ? (
          <Section variant="plain">
            <Notice
              icon="wrench"
              title={t('screens.security.maintenance.empty')}
              body={t('screens.security.maintenance.declare-description')}
              action={{
                label: t('screens.security.maintenance.declare'),
                onPress: () => setDeclaring(true),
              }}
            />
          </Section>
        ) : (
          <Section>
            {maintenance.windows.map((window) => (
              <WindowRow
                key={window.id}
                window={window}
                names={names}
                now={now}
                onEnd={maintenance.end}
              />
            ))}
          </Section>
        )}
      </Screen>
      {declaring ? (
        <MaintenanceDialog
          open
          onOpenChange={setDeclaring}
          cameras={cameras}
          environments={environments}
          onSubmit={maintenance.declare}
        />
      ) : null}
    </>
  );
}
