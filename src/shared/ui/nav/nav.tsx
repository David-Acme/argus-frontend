import { useWindowLayout } from '@/shared/theme';
import { NavBar } from './nav-bar';
import { NavRail } from './nav-rail';
import { NavSidebar } from './nav-sidebar';
import type { NavProps } from './nav-types';

export function Nav(props: NavProps) {
  const { navigation } = useWindowLayout();
  if (navigation === 'sidebar') return <NavSidebar {...props} />;
  if (navigation === 'rail') return <NavRail {...props} />;
  return <NavBar {...props} />;
}
