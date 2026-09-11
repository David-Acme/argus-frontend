/** Dedicated camera media socket served by the gateway. */
export const CAMERA_STREAM_WS_PATH = '/camera-stream';

/** fMP4 wire framing of every binary camera frame. */
export const CAMERA_STREAM_FRAME_MAGIC = 0xa7;
export const CAMERA_STREAM_FRAME_HEADER_BYTES = 12;
/** Credit release threshold: ack once the native decoder has drained below it. */
export const CAMERA_STREAM_ACK_THRESHOLD_BYTES = 512 * 1024;
export const CAMERA_STREAM_ACK_INTERVAL_MS = 250;

export const CAMERA_STREAM_RECONNECT_BASE_MS = 2000;
export const CAMERA_STREAM_RECONNECT_MAX_MS = 30000;

/** Media surface behind the letterboxed video (not a theme token). */
export const CAMERA_LIVE_BACKGROUND = '#000000';
