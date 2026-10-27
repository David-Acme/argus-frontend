import { mock } from 'bun:test';
import type { AccessView } from '@/shared/libs/capabilities';
import type { ResolvedSurfaces } from '@/shared/libs/surfaces';

const Section = () => null;

mock.module('@/features/home', () => ({
  NowSection: Section,
  ProjectsSection: Section,
  TodaySection: Section,
  TomorrowSection: Section,
  CamerasSection: Section,
  HappenedSection: Section,
  HomePeopleSection: Section,
  NewsSection: Section,
  HelpSection: Section,
  SystemSection: Section,
  WatchSection: Section,
  AttentionSection: Section,
  ModuleCards: Section,
}));

mock.module('@/features/cameras', () => ({
  RecentClipsCard: Section,
  CameraAttention: () => null,
  SecurityCard: () => null,
}));

mock.module('@/features/surfaces/components/agenda-card', () => ({ AgendaCard: Section }));
mock.module('@/features/surfaces/components/security-card', () => ({ SecurityCard: Section }));
mock.module('@/features/surfaces/components/camera-attention', () => ({
  CameraAttention: Section,
}));

const { APP_SURFACES } = await import('@/features/surfaces');
const { resolveSurfaces } = await import('@/shared/libs/surfaces/surface-registry');

export { APP_SURFACES };

export const surfacesFor = (view: AccessView): ResolvedSurfaces =>
  resolveSurfaces(APP_SURFACES, view);
