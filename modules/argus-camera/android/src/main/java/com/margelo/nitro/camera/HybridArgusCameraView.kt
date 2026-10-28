package com.margelo.nitro.camera

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.ByteArrayDataSource
import androidx.media3.datasource.DataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlaybackException
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.LoadControl
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
  internal val playerView: PlayerView =
    LayoutInflater.from(context).inflate(R.layout.argus_camera_player, null, false) as PlayerView
  private var player: ExoPlayer? = null
  private var activeState = true
  private var mutedState = true
  private var fillState = false
  private var audioFailed = false
  private var lastPosition = -1L
  private var stalledTicks = 0
  private var session: MediaSession? = null
  private val progressTick = object : Runnable {
    override fun run() {
      val current = session ?: return
      current.sample()
      mainHandler.postDelayed(this, PROGRESS_TICK_MS)
    }
  }
  private val positionLog = object : Runnable {
    override fun run() {
      val exo = player ?: return
      Log.i(TAG, "playing ${exo.isPlaying}, playWhenReady ${exo.playWhenReady} at ${positionOf(exo)}")
      watchStall(exo)
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

  override var onAudioFailed: ((stopped: Boolean) -> Unit)? = null

  override var onMediaState: ((state: String) -> Unit)? = null

  override var onFirstFrame: (() -> Unit)? = null

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

  internal fun dropAudio(exo: ExoPlayer, reason: Throwable, stopped: Boolean) {
    if (audioFailed)
      return
    audioFailed = true
    Log.w(TAG, "audio decoder failed; video plays without sound", reason)
    applyAudio(exo)
    val resumed = stopped && session?.player === exo
    if (resumed) {
      val at = session?.positionMs ?: 0L
      exo.prepare()
      exo.seekTo(at)
    }
    onAudioFailed?.invoke(stopped && !resumed)
  }

  internal fun emitMediaState(state: String) {
    onMediaState?.invoke(state)
  }

  internal fun emitFirstFrame() {
    onFirstFrame?.invoke()
  }

  private fun audioOn(): Boolean = !mutedState && !audioFailed

  private fun watchStall(exo: ExoPlayer) {
    val position = exo.currentPosition
    val waiting = exo.playWhenReady && exo.bufferedPosition > position + STALL_MARGIN_MS
    stalledTicks = if (audioOn() && waiting && position == lastPosition) stalledTicks + 1 else 0
    lastPosition = position
    if (stalledTicks >= STALL_TICKS)
      dropAudio(exo, IllegalStateException("audio held the clock at $position ms"), false)
  }

  private fun guardAudio(exo: ExoPlayer) {
    exo.addListener(
      object : Player.Listener {
        override fun onPlayerError(error: PlaybackException) {
          val failure = error as? ExoPlaybackException ?: return
          if (failure.type != ExoPlaybackException.TYPE_RENDERER)
            return
          if (exo.getRendererType(failure.rendererIndex) == C.TRACK_TYPE_AUDIO)
            dropAudio(exo, failure, true)
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
          dropAudio(exo, audioCodecError, exo.playerError != null)
        }

        override fun onAudioSinkError(eventTime: AnalyticsListener.EventTime, audioSinkError: Exception) {
          dropAudio(exo, audioSinkError, exo.playerError != null)
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

  private fun buildPlayer(sources: DataSource.Factory, load: LoadControl): ExoPlayer {
    val renderers = DefaultRenderersFactory(playerView.context)
      .setMediaCodecSelector(PlatformFlacSelector)
      .setEnableDecoderFallback(true)
    val exo = ExoPlayer.Builder(playerView.context, renderers)
      .setMediaSourceFactory(ProgressiveMediaSource.Factory(sources))
      .setLoadControl(load)
      .build()
    exo.volume = volumeOf(mutedState)
    applyAudio(exo)
    return exo
  }

  private fun startWatching() {
    lastPosition = -1L
    stalledTicks = 0
    mainHandler.removeCallbacks(positionLog)
    mainHandler.postDelayed(positionLog, POSITION_LOG_MS)
  }

  private fun startStream(init: ByteArray) {
    releasePlayer()
    frames.restart(init)
    val exo = buildPlayer(
      CameraDataSource.Factory(frames),
      DefaultLoadControl.Builder().setBufferDurationsMs(2000, 8000, 250, 250).build(),
    )
    guardAudio(exo)
    player = exo
    playerView.player = exo
    exo.setMediaItem(MediaItem.fromUri(CameraDataSource.LIVE_URI))
    exo.prepare()
    exo.playWhenReady = activeState
    startWatching()
  }

  override fun loadMedia(data: ArrayBuffer, key: String) {
    val bytes = data.toByteArray()
    runOnMain { openMedia(bytes, key) }
  }

  private fun openMedia(bytes: ByteArray, key: String) {
    MediaSession.open[key]?.close()
    releasePlayer()
    val exo = buildPlayer(DataSource.Factory { ByteArrayDataSource(bytes) }, DefaultLoadControl())
    val opened = MediaSession(key, exo)
    MediaSession.open[key] = opened
    watchMedia(opened)
    attach(opened)
    playerView.player = exo
    exo.setMediaItem(
      MediaItem.Builder().setUri(MEDIA_URI).setMimeType(MimeTypes.VIDEO_MP4).build(),
    )
    exo.prepare()
    exo.playWhenReady = activeState
  }

  private fun attach(opened: MediaSession) {
    session = opened
    opened.view = this
    player = opened.player
    applyAudio(opened.player)
    opened.player.volume = volumeOf(mutedState)
    playerView.keepScreenOn = opened.player.isPlaying
    mainHandler.removeCallbacks(progressTick)
    mainHandler.post(progressTick)
    startWatching()
    emitMediaState(MediaStates.of(opened.player))
  }

  private fun yieldSession() {
    mainHandler.removeCallbacks(progressTick)
    mainHandler.removeCallbacks(positionLog)
    playerView.keepScreenOn = false
    session = null
    player = null
  }

  override fun adoptMedia(key: String): Boolean {
    val found = MediaSession.open[key] ?: return false
    runOnMain { adopt(found) }
    return true
  }

  private fun adopt(found: MediaSession) {
    val previous = found.view
    if (previous === this)
      return
    if (session !== found)
      releasePlayer()
    previous?.yieldSession()
    PlayerView.switchTargetView(found.player, previous?.playerView, playerView)
    attach(found)
  }

  override fun releaseMedia(key: String) {
    runOnMain {
      if (session?.key == key)
        releasePlayer()
    }
  }

  override fun play() {
    runOnMain {
      val exo = session?.player ?: return@runOnMain
      if (exo.playbackState == Player.STATE_ENDED)
        exo.seekTo(0L)
      exo.playWhenReady = true
    }
  }

  override fun pause() {
    runOnMain { session?.player?.playWhenReady = false }
  }

  override fun seekTo(positionMs: Double) {
    runOnMain {
      val current = session ?: return@runOnMain
      current.player.seekTo(positionMs.toLong().coerceAtLeast(0L))
      current.sample()
    }
  }

  override fun setRate(rate: Double) {
    runOnMain { session?.player?.setPlaybackSpeed(rate.toFloat()) }
  }

  override fun mediaPositionMs(): Double = (session?.positionMs ?: 0L).toDouble()

  override fun mediaDurationMs(): Double = (session?.durationMs ?: 0L).toDouble()

  override fun mediaBufferedMs(): Double = (session?.bufferedMs ?: 0L).toDouble()

  private fun watchMedia(opened: MediaSession) {
    val exo = opened.player
    exo.addListener(
      object : Player.Listener {
        override fun onPlaybackStateChanged(playbackState: Int) {
          opened.sample()
          opened.view?.emitMediaState(MediaStates.of(exo))
        }

        override fun onIsPlayingChanged(isPlaying: Boolean) {
          opened.view?.playerView?.keepScreenOn = isPlaying
          opened.view?.emitMediaState(MediaStates.of(exo))
        }

        override fun onPlayerError(error: PlaybackException) {
          val failure = error as? ExoPlaybackException
          val audio = failure?.type == ExoPlaybackException.TYPE_RENDERER &&
            exo.getRendererType(failure.rendererIndex) == C.TRACK_TYPE_AUDIO
          if (audio && failure != null)
            opened.view?.dropAudio(exo, failure, true)
          else
            opened.view?.emitMediaState(MediaStates.ERROR)
        }
      },
    )
    exo.addAnalyticsListener(
      object : AnalyticsListener {
        override fun onRenderedFirstFrame(eventTime: AnalyticsListener.EventTime, output: Any, renderTimeMs: Long) {
          Log.i(TAG, "media first frame at position ${eventTime.currentPlaybackPositionMs} ms")
          opened.view?.emitFirstFrame()
        }

        override fun onAudioCodecError(eventTime: AnalyticsListener.EventTime, audioCodecError: Exception) {
          opened.view?.dropAudio(exo, audioCodecError, exo.playerError != null)
        }

        override fun onAudioSinkError(eventTime: AnalyticsListener.EventTime, audioSinkError: Exception) {
          opened.view?.dropAudio(exo, audioSinkError, exo.playerError != null)
        }
      },
    )
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
    mainHandler.removeCallbacks(progressTick)
    val owned = session
    if (owned != null) {
      owned.close()
      session = null
    } else {
      player?.let {
        it.stop()
        it.release()
      }
    }
    player = null
    playerView.player = null
    playerView.keepScreenOn = false
    frames.abort()
  }

  private companion object {
    const val TAG = "ArgusCamera"
    const val POSITION_LOG_MS = 2000L
    const val STALL_MARGIN_MS = 500L
    const val STALL_TICKS = 2
    const val PROGRESS_TICK_MS = 200L
    const val MEDIA_URI = "argus-camera://media"
  }

  private fun runOnMain(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper())
      block()
    else
      mainHandler.post(block)
  }
}
