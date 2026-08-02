import { Camera, Monitor, Moon, ShieldCheck, Sparkles, Sun, Video } from 'lucide-react-native';

/**
 * Centralized ARGUS icon registry.
 *
 * Only file that imports from an icon library. To use a new icon: import it
 * here and add it to the map (kebab-case key). The rest of the app consumes
 * icons via `Icon name="<key>"` — never imports from lucide directly.
 */
export const ICONS = {
  camera: Camera,
  monitor: Monitor,
  moon: Moon,
  'shield-check': ShieldCheck,
  sparkles: Sparkles,
  sun: Sun,
  video: Video,
} as const;
