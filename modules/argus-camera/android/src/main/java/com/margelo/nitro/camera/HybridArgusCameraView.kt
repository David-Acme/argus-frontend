package com.margelo.nitro.camera

import android.content.Context
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.view.View
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.ui.PlayerView
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.views.HybridView

@DoNotStrip
@UnstableApi
class HybridArgusCameraView(context: Context) : HybridArgusCameraViewSpec() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val frames = CameraFrameBuffer()
  private val playerView: PlayerView = PlayerView(context).apply {
    useController = false
    setShutterBackgroundColor(Color.BLACK)
  }
  private var player: ExoPlayer? = null
  private var activeState = true

  override val view: View
    get() = playerView

  override var active: Boolean
    get() = activeState
    set(value) {
      activeState = value
      player?.playWhenReady = value
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
    val exo = ExoPlayer.Builder(playerView.context)
      .setMediaSourceFactory(
        ProgressiveMediaSource.Factory(CameraDataSource.Factory(frames)),
      )
      .setLoadControl(
        DefaultLoadControl.Builder()
          .setBufferDurationsMs(2000, 8000, 250, 250)
          .build(),
      )
      .build()
    player = exo
    playerView.player = exo
    exo.setMediaItem(MediaItem.fromUri(CameraDataSource.LIVE_URI))
    exo.prepare()
    exo.playWhenReady = activeState
  }

  private fun releasePlayer() {
    player?.let {
      it.stop()
      it.release()
    }
    player = null
    playerView.player = null
    frames.abort()
  }

  private fun runOnMain(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper())
      block()
    else
      mainHandler.post(block)
  }
}
