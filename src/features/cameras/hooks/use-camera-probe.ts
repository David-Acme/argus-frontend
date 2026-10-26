import { useRef, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ICameraProbeResult } from '@/core/interfaces';
import type { CameraFormValues } from '@/features/cameras/components/camera-form-schema';
import { probeInputOf } from '@/features/cameras/model/camera-form-steps';
import { probeRefusalOf } from '@/features/cameras/model/camera-probe';
import type { ProbeRefusal } from '@/features/cameras/model/camera-probe';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';

export type CameraProbe = {
  running: boolean;
  result: ICameraProbeResult | null;
  failed: boolean;
  refusal: ProbeRefusal | null;
  run: () => Promise<void>;
  forget: () => void;
};

export function useCameraProbe(
  form: UseFormReturn<CameraFormValues>,
  cameraId?: string
): CameraProbe {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ICameraProbeResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [refusal, setRefusal] = useState<ProbeRefusal | null>(null);
  const runs = useRef(0);

  const run = async () => {
    const current = runs.current + 1;
    runs.current = current;
    setRunning(true);
    setFailed(false);
    setRefusal(null);
    setResult(null);
    const response = await cameraControlService.probe(probeInputOf(form.getValues(), cameraId));
    if (current !== runs.current) return;
    setRunning(false);
    if (!response.ok || !response.info) {
      const values = form.getValues();
      setFailed(true);
      setRefusal(probeRefusalOf(response, values.noPassword || values.noCloudPassword));
      return;
    }
    const answer = response.info;
    setResult(answer);
    if (answer.catalogId && !form.getValues('catalogId'))
      form.setValue('catalogId', answer.catalogId);
    if (answer.device.model && !form.getValues('model'))
      form.setValue('model', answer.device.model);
  };

  return { running, result, failed, refusal, run, forget: () => setResult(null) };
}
