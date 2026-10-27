import {
  PanesProjects,
  PhoneProject,
  PhoneProjects,
} from '@/features/projects/components/projects-layouts';
import { useProjectsScreen } from '@/features/projects/hooks/use-projects-screen';

export default function ProjectsScreen() {
  const state = useProjectsScreen();
  if (!state.compact) return <PanesProjects state={state} />;
  if (state.view) return <PhoneProject state={state} view={state.view} />;
  return <PhoneProjects state={state} />;
}
