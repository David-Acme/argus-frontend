import { CAMERA_THUMBNAIL_REFRESH_MS } from '@/features/cameras/constants';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';

type ThumbnailListener = (thumbnails: ReadonlyMap<string, string>) => void;

export class CameraThumbnailPoller {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private readonly thumbnails = new Map<string, string>();

  constructor(
    private readonly ids: readonly string[],
    private readonly listener: ThumbnailListener,
  ) {}

  start(): void {
    void this.refresh();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async refresh(): Promise<void> {
    for (const id of this.ids) {
      if (this.stopped) return;
      const result = await cameraControlService.snapshot(id);
      if (this.stopped) return;
      if (result.ok && result.info?.image) {
        this.thumbnails.set(id, result.info.image);
        this.listener(new Map(this.thumbnails));
      }
    }
    if (!this.stopped) this.timer = setTimeout(() => void this.refresh(), CAMERA_THUMBNAIL_REFRESH_MS);
  }
}
