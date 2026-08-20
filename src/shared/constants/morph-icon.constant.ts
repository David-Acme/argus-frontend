import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Flashlight,
  Menu,
  Mic,
  MicOff,
  Pause,
  Play,
  RefreshCw,
  ScanFace,
  SkipForward,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide';

/**
 * Central registry of animatable icons (morphicons). Icons are consumed as
 * DATA from the vanilla `lucide` package (IconNode), never as components —
 * the static registry (`icon.constant.ts`) keeps using `lucide-react-native`.
 */
export const MORPH_ICONS = {
  'arrow-right': ArrowRight,
  camera: Camera,
  check: Check,
  'check-circle': CheckCircle2,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  eye: Eye,
  flashlight: Flashlight,
  menu: Menu,
  mic: Mic,
  'mic-off': MicOff,
  pause: Pause,
  play: Play,
  'refresh-cw': RefreshCw,
  'scan-face': ScanFace,
  'skip-forward': SkipForward,
  sparkles: Sparkles,
  'triangle-alert': TriangleAlert,
  x: X,
} as const;
