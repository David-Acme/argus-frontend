import { lazyScreen } from '@/shared/libs/lazy-screen';
export { PrivacyGate } from './components/privacy-gate';
export { HouseholdPrivacyPanel } from './components/household-privacy-panel';
export { UserPrivacyRow } from './components/user-privacy-row';
export { MinorRow } from './components/minor-row';
export { ConsentForm } from './components/consent-form';
export { privacyService } from './services/privacy.service';
export {
  answeredChoices,
  chosenModuleIds,
  consentDraft,
  coreSignals,
  decisionOf,
  NO_CHOICES,
  onlyCoreChoices,
  signalsToAsk,
} from './model/privacy';
export { PrivacyChoiceList } from './components/privacy-choice-list';
export { usePrivacy } from './hooks/use-privacy';
export { VisitorAcknowledgementDialog } from './components/visitor-acknowledgement-dialog';
export { useVisitorRecognitionSwitch } from './hooks/use-visitor-recognition-switch';
export { useHouseholdWatchman } from './hooks/use-household-watchman';
export { SignageDialog } from './components/signage-dialog';
export type { WatchmanReadiness } from './model/privacy';
export const PrivacyScreen = lazyScreen(() => import('./screens/privacy-screen'), 'default');
