package com.margelo.nitro.camera

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlaybackException
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.analytics.AnalyticsListener
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.views.HybridView

@DoNotStrip
@UnstableApi
class HybridArgusCameraView(context: Context) : HybridArgusCameraViewSpec() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val frames = CameraFrameBuffer()
  private val playerView: PlayerView =
    LayoutInflater.from(context).inflate(R.layout.argus_camera_player, null, false) as PlayerView
  private var player: ExoPlayer? = null
  private var activeState = true
  private var mutedState = true
  private var fillState = false
  private var audioFailed = false
  private val positionLog = object : Runnable {
    override fun run() {
      val exo = player ?: return
      Log.i(TAG, "playing ${exo.isPlaying}, playWhenReady ${exo.playWhenReady} at ${positionOf(exo)}")
      mainHandler.postDelayed(this, POSITION_LOG_MS)
    }
  }

  override val view: View
    get() = playerView

  override var active: Boolean
    get() = activeState
    set(value) {
      activeState = value
      runOnMain { player?.playWhenReady = value }
    }

  override var muted: Boolean
    get() = mutedState
    set(value) {
      mutedState = value
      runOnMain {
        player?.let {
          it.volume = volumeOf(value)
          applyAudio(it)
        }
      }
    }

  override var fill: Boolean
    get() = fillState
    set(value) {
      fillState = value
      runOnMain { playerView.resizeMode = resizeModeOf(value) }
    }

  private fun resizeModeOf(fill: Boolean): Int =
    if (fill) AspectRatioFrameLayout.RESIZE_MODE_ZOOM else AspectRatioFrameLayout.RESIZE_MODE_FIT

  private fun volumeOf(muted: Boolean): Float = if (muted) 0f else 1f

  private fun applyAudio(exo: ExoPlayer) {
    exo.trackSelectionParameters = exo.trackSelectionParameters
      .buildUpon()
      .setTrackTypeDisabled(C.TRACK_TYPE_AUDIO, mutedState || audioFailed)
      .build()
  }

  private fun dropAudio(exo: ExoPlayer, reason: Throwable) {
    if (audioFailed)
      return
    audioFailed = true
    Log.w(TAG, "audio decoder failed; video plays without sound", reason)
    applyAudio(exo)
  }

  private fun guardAudio(exo: ExoPlayer) {
    exo.addListener(
      object : Player.Listener {
        override fun onPlayerError(error: PlaybackException) {
          val failure = error as? ExoPlaybackException ?: return
          if (failure.type != ExoPlaybackException.TYPE_RENDERER)
            return
          if (exo.getRendererType(failure.rendererIndex) == C.TRACK_TYPE_AUDIO)
            dropAudio(exo, failure)
        }
      },
    )
    exo.addAnalyticsListener(
      object : AnalyticsListener {
        override fun onRenderedFirstFrame(eventTime: AnalyticsListener.EventTime, output: Any, renderTimeMs: Long) {
          Log.i(TAG, "first frame rendered at position ${eventTime.currentPlaybackPositionMs} ms")
        }

        override fun onPlaybackStateChanged(eventTime: AnalyticsListener.EventTime, state: Int) {
          Log.i(TAG, "state ${stateName(state)} at ${positionOf(exo)}")
        }

        override fun onPlayWhenReadyChanged(eventTime: AnalyticsListener.EventTime, playWhenReady: Boolean, reason: Int) {
          Log.i(TAG, "playWhenReady $playWhenReady (reason $reason) at ${positionOf(exo)}")
        }

        override fun onAudioCodecError(eventTime: AnalyticsListener.EventTime, audioCodecError: Exception) {
          dropAudio(exo, audioCodecError)
        }

        override fun onAudioSinkError(eventTime: AnalyticsListener.EventTime, audioSinkError: Exception) {
          dropAudio(exo, audioSinkError)
        }
      },
    )
  }

  override fun resetStream() {
    runOnMain { releasePlayer() }
  }

  override fun pushFragment(type: Double, keyframe: Boolean, data: ArrayBuffer) {
    val bytes = data.toByteArray()
    runOnMain {
      if (type.toInt() == 1)
        startStream(bytes)
      else
        frames.append(bytes)
    }
  }

  override fun bufferedBytes(): Double = frames.availableBytes().toDouble()

  private fun startStream(init: ByteArray) {
    releasePlayer()
    frames.restart(init)
    val renderers = DefaultRenderersFactory(playerView.context)
      .setMediaCodecSelector(PlatformFlacSelector)
      .setEnableDecoderFallback(true)
    val exo = ExoPlayer.Builder(playerView.context, renderers)
      .setMediaSourceFactory(
        ProgressiveMediaSource.Factory(CameraDataSource.Factory(frames)),
      )
      .setLoadControl(
        DefaultLoadControl.Builder()
          .setBufferDurationsMs(2000, 8000, 250, 250)
          .build(),
      )
      .build()
    exo.volume = volumeOf(mutedState)
    applyAudio(exo)
    guardAudio(exo)
    player = exo
    playerView.player = exo
    exo.setMediaItem(MediaItem.fromUri(CameraDataSource.LIVE_URI))
    exo.prepare()
    exo.playWhenReady = activeState
    mainHandler.removeCallbacks(positionLog)
    mainHandler.postDelayed(positionLog, POSITION_LOG_MS)
  }

  private fun positionOf(exo: ExoPlayer): String =
    "position ${exo.currentPosition} ms, buffered to ${exo.bufferedPosition} ms"

  private fun stateName(state: Int): String =
    when (state) {
      Player.STATE_IDLE -> "idle"
      Player.STATE_BUFFERING -> "buffering"
      Player.STATE_READY -> "ready"
      Player.STATE_ENDED -> "ended"
      else -> state.toString()
    }

  private fun releasePlayer() {
    mainHandler.removeCallbacks(positionLog)
    player?.let {
      it.stop()
      it.release()
    }
    player = null
    playerView.player = null
    frames.abort()
  }

  private companion object {
    const val TAG = "ArgusCamera"
    const val POSITION_LOG_MS = 2000L
  }

  private fun runOnMain(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper())
      block()
    else
      mainHandler.post(block)
  }
}
