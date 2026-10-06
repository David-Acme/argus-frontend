import type {
  IconName,
  LanguageCode,
  ModuleHardware,
  ModuleJob,
  ModuleJobState,
  ModuleRecord,
  ModuleVerdict,
  TranslateFn,
  TranslationKey,
} from '@/core/types';

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

const LOCALE: Readonly<Record<LanguageCode, string>> = { es: 'es-ES', en: 'en-US' };

const number = (value: number, language: LanguageCode, digits: number) =>
  new Intl.NumberFormat(LOCALE[language], { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);

export function formatBytes(bytes: number, language: LanguageCode): string {
  const value = Math.max(0, bytes);
  if (value >= GB) return `${number(value / GB, language, value >= 10 * GB ? 0 : 1)} GB`;
  if (value >= MB) return `${number(value / MB, language, 0)} MB`;
  if (value >= KB) return `${number(value / KB, language, 0)} KB`;
  return `${number(value, language, 0)} B`;
}

export const formatMegabytes = (megabytes: number, language: LanguageCode): string =>
  formatBytes(megabytes * MB, language);

export const percentOf = (progress: number): number => Math.min(100, Math.max(0, Math.floor(progress * 100)));

export type EtaText = { unit: 'seconds' | 'minutes' | 'hours'; count: number };

export function etaOf(seconds: number | null): EtaText | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return null;
  if (seconds < 60) return { unit: 'seconds', count: 0 };
  if (seconds < 3600) return { unit: 'minutes', count: Math.ceil(seconds / 60) };
  return { unit: 'hours', count: Math.max(1, Math.round(seconds / 3600)) };
}

export function etaLabel(eta: EtaText, t: TranslateFn): string {
  if (eta.unit === 'seconds') return t('screens.modules.eta.seconds');
  if (eta.unit === 'minutes') return t('screens.modules.eta.minutes', { count: String(eta.count) });
  return t('screens.modules.eta.hours', { count: String(eta.count) });
}

export type ProgressFacts = {
  percent: number;
  amount: { done: string; total: string } | null;
  speed: string | null;
  eta: EtaText | null;
};

const MOVING: ReadonlySet<ModuleJobState> = new Set(['downloading']);

export function progressFacts(job: ModuleJob, language: LanguageCode): ProgressFacts {
  const moving = MOVING.has(job.state);
  return {
    percent: job.state === 'done' ? 100 : percentOf(job.progress),
    amount:
      job.bytesTotal > 0
        ? { done: formatBytes(job.bytesDone, language), total: formatBytes(job.bytesTotal, language) }
        : null,
    speed: moving && job.bytesPerSecond > 0 ? formatBytes(job.bytesPerSecond, language) : null,
    eta: moving ? etaOf(job.etaSeconds) : null,
  };
}

export function progressLine(job: ModuleJob, language: LanguageCode, t: TranslateFn): string {
  const facts = progressFacts(job, language);
  const parts: string[] = [t(jobLabelKey(job))];
  if (facts.amount) parts.push(t('screens.modules.amount', facts.amount));
  if (facts.speed) parts.push(t('screens.modules.speed', { speed: facts.speed }));
  if (facts.eta) {
    parts.push(t('screens.modules.eta-left', { eta: etaLabel(facts.eta, t) }));
  }
  return parts.join(' · ');
}

const JOB_KEYS: Readonly<Record<ModuleJobState, TranslationKey>> = {
  queued: 'screens.modules.job.queued',
  checking: 'screens.modules.job.checking',
  downloading: 'screens.modules.job.downloading',
  verifying: 'screens.modules.job.verifying',
  activating: 'screens.modules.job.activating',
  health_check: 'screens.modules.job.health_check',
  done: 'screens.modules.job.done',
  paused: 'screens.modules.job.paused',
  failed: 'screens.modules.job.failed',
  cancelled: 'screens.modules.job.cancelled',
};

export const jobStateKey = (state: ModuleJobState): TranslationKey => JOB_KEYS[state];

const KIND_KEYS: Readonly<Record<Exclude<ModuleJob['kind'], 'install'>, { running: TranslationKey; done: TranslationKey; failed: TranslationKey }>> = {
  uninstall: {
    running: 'screens.modules.job-kind.uninstall.running',
    done: 'screens.modules.job-kind.uninstall.done',
    failed: 'screens.modules.job-kind.uninstall.failed',
  },
  purge: {
    running: 'screens.modules.job-kind.purge.running',
    done: 'screens.modules.job-kind.purge.done',
    failed: 'screens.modules.job-kind.purge.failed',
  },
};

export function jobLabelKey(job: Pick<ModuleJob, 'kind' | 'state'>): TranslationKey {
  if (job.kind === 'install' || job.state === 'paused' || job.state === 'cancelled' || job.state === 'queued') {
    return jobStateKey(job.state);
  }
  const keys = KIND_KEYS[job.kind];
  return job.state === 'done' ? keys.done : job.state === 'failed' ? keys.failed : keys.running;
}

const VERDICT_KEYS: Readonly<Record<ModuleVerdict, TranslationKey>> = {
  ok: 'screens.modules.verdict.ok',
  slow: 'screens.modules.verdict.slow',
  insufficient: 'screens.modules.verdict.insufficient',
};

export const verdictKey = (verdict: ModuleVerdict): TranslationKey => VERDICT_KEYS[verdict];

const FAILURE_KEYS: Readonly<Record<string, TranslationKey>> = {
  disk_full: 'screens.modules.failure.disk_full',
  network: 'screens.modules.failure.network',
  source_unavailable: 'screens.modules.failure.source_unavailable',
  checksum_mismatch: 'screens.modules.failure.checksum_mismatch',
  health_check_failed: 'screens.modules.failure.health_check_failed',
  host_only: 'screens.modules.failure.host_only',
  interrupted: 'screens.modules.failure.interrupted',
  hardware_insufficient: 'screens.modules.failure.hardware_insufficient',
  dependency_failed: 'screens.modules.failure.dependency_failed',
  owner_unreachable: 'screens.modules.failure.owner_unreachable',
};

const codeOf = (reason: string) => reason.trim().toLowerCase().replace(/[\s-]+/g, '_');

export const failureKey = (reason: string | null): TranslationKey =>
  (reason ? FAILURE_KEYS[codeOf(reason)] : undefined) ?? 'screens.modules.failure.unknown';

const looksLikeSentence = (reason: string) => /\s/.test(reason.trim());

export function hardwareReasonText(
  reason: string,
  hardware: ModuleHardware,
  language: LanguageCode,
  t: TranslateFn
): string {
  const min = formatMegabytes(hardware.minRamMb, language);
  const recommended = formatMegabytes(hardware.recommendedRamMb, language);
  const free = formatMegabytes(hardware.freeDiskMb, language);
  switch (codeOf(reason)) {
    case 'ram_below_minimum':
      return t('screens.modules.reason.ram_below_minimum', { min });
    case 'ram_below_recommended':
      return t('screens.modules.reason.ram_below_recommended', { recommended });
    case 'disk_insufficient':
      return t('screens.modules.reason.disk_insufficient', { free });
    case 'cpu_feature_missing':
      return t('screens.modules.reason.cpu_feature_missing');
    case 'gpu_missing':
      return t('screens.modules.reason.gpu_missing');
    default:
      return looksLikeSentence(reason) ? reason.trim() : '';
  }
}

const MODULE_ICONS: Readonly<Record<string, IconName>> = {
  core: 'sparkles',
  surveillance: 'shield-check',
  productivity: 'list-todo',
  agronomy: 'sprout',
};

export const moduleIcon = (id: string): IconName => MODULE_ICONS[id] ?? 'blocks';

export type ModuleStatus =
  | 'core'
  | 'coming-soon'
  | 'enabled'
  | 'installing'
  | 'paused'
  | 'failed'
  | 'blocked'
  | 'available';

export function moduleStatus(module: ModuleRecord): ModuleStatus {
  if (module.kind === 'core') return 'core';
  if (module.kind === 'coming_soon') return 'coming-soon';
  const state = module.job?.state;
  if (state === 'failed') return 'failed';
  if (state === 'paused') return 'paused';
  if (state && state !== 'done' && state !== 'cancelled') return 'installing';
  if (module.enabled) return 'enabled';
  if (module.hardware?.verdict === 'insufficient') return 'blocked';
  return 'available';
}

export function moduleNames(ids: readonly string[], modules: readonly ModuleRecord[], t: TranslateFn): string {
  return ids
    .map((id) => modules.find((module) => module.id === id))
    .map((module, index) => module?.name || (ids[index] === 'core' ? t('screens.modules.core-name') : ids[index] ?? ''))
    .filter((name) => name.length > 0)
    .join(', ');
}


export const hostCommands = (module: ModuleRecord): string[] =>
  module.components
    .filter((component) => component.source === 'provisioned' && !component.ready && component.hostCommand)
    .map((component) => component.hostCommand ?? '');
