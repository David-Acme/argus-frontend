package com.margelo.nitro.camera

import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import java.util.concurrent.ConcurrentHashMap

@UnstableApi
internal class MediaSession(val key: String, val player: ExoPlayer) {
  @Volatile var view: HybridArgusCameraView? = null
  @Volatile var positionMs = 0L
  @Volatile var durationMs = 0L
  @Volatile var bufferedMs = 0L

  fun sample() {
    positionMs = player.currentPosition.coerceAtLeast(0L)
    bufferedMs = player.bufferedPosition.coerceAtLeast(0L)
    val duration = player.duration
    durationMs = if (duration == C.TIME_UNSET) 0L else duration.coerceAtLeast(0L)
  }

  fun close() {
    open.remove(key, this)
    view = null
    player.stop()
    player.release()
  }

  companion object {
    val open = ConcurrentHashMap<String, MediaSession>()
  }
}
