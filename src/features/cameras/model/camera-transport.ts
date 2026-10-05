import type { ICameraPictureStats } from '@/core/interfaces';
import type { CameraTransport } from '@/core/types';
import {
  CAMERA_RTC_BACKOFF_BASE_MS,
  CAMERA_RTC_BACKOFF_MAX_MS,
} from '@/features/cameras/constants';

export type RtcBackoff = {
  failures: number;
  retryAt: number;
};

export type TransportChoice = {
  rtcSupported: boolean;
  backoff: RtcBackoff;
  now: number;
};

export type RtcStatsReading = {
  at: number;
  width: number;
  height: number;
  framesDecoded: number;
  audioPackets: number;
};

export type RtcStatsReport = {
  forEach(callback: (stat: unknown) => void): void;
};

type InboundSample = {
  type?: unknown;
  kind?: unknown;
  mediaType?: unknown;
  framesDecoded?: unknown;
  frameWidth?: unknown;
  frameHeight?: unknown;
  packetsReceived?: unknown;
};

export const INITIAL_RTC_BACKOFF: RtcBackoff = { failures: 0, retryAt: 0 };

export function firstTransport({ rtcSupported, backoff, now }: TransportChoice): CameraTransport {
  return rtcSupported && now >= backoff.retryAt ? 'webrtc' : 'ws';
}

export function afterRtcFailure(backoff: RtcBackoff, now: number): RtcBackoff {
  const delay = Math.min(
    CAMERA_RTC_BACKOFF_MAX_MS,
    CAMERA_RTC_BACKOFF_BASE_MS * 2 ** backoff.failures
  );
  return { failures: backoff.failures + 1, retryAt: now + delay };
}

export function afterRtcSuccess(): RtcBackoff {
  return INITIAL_RTC_BACKOFF;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function readRtcStats(report: RtcStatsReport, at: number): RtcStatsReading {
  const reading: RtcStatsReading = { at, width: 0, height: 0, framesDecoded: 0, audioPackets: 0 };
  report.forEach((stat) => {
    const sample = stat as InboundSample;
    if (sample.type !== 'inbound-rtp') return;
    const kind = sample.kind ?? sample.mediaType;
    if (kind === 'video') {
      reading.framesDecoded += count(sample.framesDecoded);
      reading.width = Math.max(reading.width, count(sample.frameWidth));
      reading.height = Math.max(reading.height, count(sample.frameHeight));
    } else if (kind === 'audio') {
      reading.audioPackets += count(sample.packetsReceived);
    }
  });
  return reading;
}

export function hasFirstFrame(reading: RtcStatsReading): boolean {
  return reading.framesDecoded > 0;
}

export function rtcStreamStats(
  previous: RtcStatsReading | null,
  next: RtcStatsReading
): ICameraPictureStats {
  const elapsed = previous ? (next.at - previous.at) / 1000 : 0;
  const frames = previous ? next.framesDecoded - previous.framesDecoded : 0;
  return {
    width: next.width,
    height: next.height,
    fps: elapsed > 0 && frames > 0 ? Math.round(frames / elapsed) : 0,
    audio: next.audioPackets > 0 && (!previous || next.audioPackets > previous.audioPackets),
  };
}

export function isRtcStalled(lastProgressAt: number, now: number, stallMs: number): boolean {
  return lastProgressAt > 0 && now - lastProgressAt >= stallMs;
}
