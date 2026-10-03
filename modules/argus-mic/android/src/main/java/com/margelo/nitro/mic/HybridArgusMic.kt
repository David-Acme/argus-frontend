package com.margelo.nitro.mic

import android.os.Handler
import android.os.Looper
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.NullType
import java.nio.ByteOrder

@DoNotStrip
class HybridArgusMic : HybridArgusMicSpec() {

  override var onData: Variant__pcm__Variant_NullType_ArrayBuffer______Unit_NullType =
    Variant__pcm__Variant_NullType_ArrayBuffer______Unit_NullType.create(NullType.NULL)
  override var onError: Variant__code__String__message__String_____Unit_NullType =
    Variant__code__String__message__String_____Unit_NullType.create(NullType.NULL)
  override var onPlayerIdle: Variant_______Unit_NullType =
    Variant_______Unit_NullType.create(NullType.NULL)

  private val mainHandler = Handler(Looper.getMainLooper())
  private val session = CallAudioSession()
  private val capture = PcmCapture(
    onChunk = { bytes ->
      val chunk = ArrayBuffer.copy(bytes)
      mainHandler.post { onData.asFirstOrNull()?.invoke(Variant_NullType_ArrayBuffer.create(chunk)) }
    },
    onFailure = ::emitError,
  )
  private val player = PcmPlayer(
    onIdle = { mainHandler.post { onPlayerIdle.asFirstOrNull()?.invoke() } },
    onFailure = ::emitError,
  )

  override fun start(sampleRate: Double) {
    if (capture.isRunning) return
    session.acquire()
    if (!capture.start(sampleRate.toInt().coerceAtLeast(MIN_RATE))) session.release()
  }

  override fun stop() {
    if (!capture.isRunning) return
    capture.stop()
    session.release()
    mainHandler.post { onData.asFirstOrNull()?.invoke(Variant_NullType_ArrayBuffer.create(NullType.NULL)) }
  }

  override fun playerStart(sampleRate: Double) {
    if (player.isRunning) return
    session.acquire()
    if (!player.start(sampleRate.toInt().coerceAtLeast(MIN_RATE), capture.sessionId)) session.release()
  }

  override fun playerWrite(pcm: ArrayBuffer) {
    if (!player.isRunning) return
    val bytes = pcm.getBuffer(true).order(ByteOrder.LITTLE_ENDIAN)
    val samples = ShortArray(bytes.remaining() / 2)
    bytes.asShortBuffer().get(samples)
    player.write(samples)
  }

  override fun playerFlush() {
    player.flush()
  }

  override fun playerStop() {
    if (!player.isRunning) return
    player.stop()
    session.release()
  }

  override fun playedSamples(): Double = player.playedFrames().toDouble()

  private fun emitError(code: String, message: String) {
    mainHandler.post { onError.asFirstOrNull()?.invoke(code, message) }
  }

  companion object {
    private const val MIN_RATE = 8000
  }
}
