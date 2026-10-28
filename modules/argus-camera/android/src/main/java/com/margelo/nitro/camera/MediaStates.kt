package com.margelo.nitro.camera

import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer

@UnstableApi
internal object MediaStates {
  const val ERROR = "error"

  fun of(player: ExoPlayer): String =
    when {
      player.playerError != null -> ERROR
      player.playbackState == Player.STATE_ENDED -> "ended"
      player.playbackState != Player.STATE_READY -> "loading"
      player.isPlaying -> "playing"
      else -> "ready"
    }
}
