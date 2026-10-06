export type ModuleKind = 'core' | 'available' | 'coming_soon';

export type ModuleLifecycle = 'not_installed' | 'active' | 'disabled' | 'uninstalled_data_kept';

export type ModuleVerdict = 'ok' | 'slow' | 'insufficient';

export type ModuleJobState =
  | 'queued'
  | 'checking'
  | 'downloading'
  | 'verifying'
  | 'activating'
  | 'health_check'
  | 'removing'
  | 'purging'
  | 'done'
  | 'paused'
  | 'failed'
  | 'cancelled';

export type ModuleHardware = {
  verdict: ModuleVerdict;
  reasons: string[];
  minRamMb: number;
  recommendedRamMb: number;
  freeDiskMb: number | null;
};

export type ModuleJobKind = 'install' | 'uninstall' | 'purge';

export type ModuleJob = {
  id: string;
  kind: ModuleJobKind;
  state: ModuleJobState;
  progress: number;
  bytesDone: number;
  bytesTotal: number;
  bytesPerSecond: number;
  etaSeconds: number | null;
  reason: string | null;
  owner: string | null;
};

export type ModuleGettingStartedStep = {
  id: string;
  title: string;
  hint: string;
  route: string | null;
};

export type ModuleComponent = {
  id: string;
  owner: string;
  source: 'download' | 'provisioned';
  reachable: boolean;
  reported: boolean;
  state: string;
  bytesPresent: number;
  bytesTotal: number;
  ready: boolean;
  hostCommand: string | null;
  reason: string | null;
};

export type ModuleIntro = {
  what: string;
  examples: string[];
};

export type ModuleIntros = {
  any?: ModuleIntro;
  es?: ModuleIntro;
  en?: ModuleIntro;
};

export type LocalizedText = {
  es?: string;
  en?: string;
};

export type ModuleTexts = {
  name: LocalizedText;
  summary: LocalizedText;
};

export type ModuleRecord = {
  id: string;
  name: string;
  summary: string;
  texts: ModuleTexts | null;
  intro: ModuleIntros | null;
  roles: string[];
  kind: ModuleKind;
  lifecycle: ModuleLifecycle;
  enabled: boolean;
  hasData: boolean;
  dataPurgedAt: number | null;
  requires: string[];
  sizeBytes: number;
  installedBytes: number;
  hardware: ModuleHardware | null;
  job: ModuleJob | null;
  gettingStarted: ModuleGettingStartedStep[];
  components: ModuleComponent[];
  detailed: boolean;
};

export type ModuleEnabledFlag = {
  id: string;
  enabled: boolean;
  dataPurgedAt?: number | null;
};

export type ModuleFrame =
  | { kind: 'module'; module: ModuleRecord }
  | { kind: 'enabled'; modules: ModuleEnabledFlag[]; version: number | null };

export type ModuleCatalog = {
  modules: ModuleRecord[];
  fetchedAt: number;
};

export type ModuleAction = 'install' | 'pause' | 'resume' | 'cancel' | 'disable' | 'uninstall';

export type ModuleUninstall = {
  keepData: boolean;
  pin?: string;
};

export type ModuleDataItem = {
  kind: string;
  count: number;
};

export type ModuleDataOwner = {
  owner: string;
  reachable: boolean;
  reported: boolean;
  items: ModuleDataItem[];
  bytes: number;
};

export type ModuleTransition = {
  id: string;
  name: string;
  kind: ModuleJobKind;
  state: 'done' | 'failed';
  reason: string | null;
  owner: string | null;
};
