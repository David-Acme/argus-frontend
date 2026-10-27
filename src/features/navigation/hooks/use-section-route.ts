import { usePathname, useRouter } from 'expo-router';
import { tabMove } from '@/features/navigation/model/nav-sections';

export function useSectionRoute(): (href: string) => void {
  const router = useRouter();
  const pathname = usePathname();
  return (href) => {
    const move = tabMove(pathname, href);
    if (move === 'stay') return;
    if (move === 'home') {
      if (router.canDismiss()) router.dismissTo('/');
      else router.replace('/');
      return;
    }
    if (move === 'push') router.push(href);
    else router.replace(href);
  };
}
