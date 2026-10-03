package com.margelo.nitro.mic

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Handler
import android.os.Looper
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.NullType
import java.util.concurrent.atomic.AtomicBoolean

@DoNotStrip
class HybridArgusMic : HybridArgusMicSpec() {

  override var onData: Variant__pcm__Variant_NullType_ArrayBuffer______Unit_NullType =
    Variant__pcm__Variant_NullType_ArrayBuffer______Unit_NullType.create(NullType.NULL)
  override var onError: Variant__code__String__message__String_____Unit_NullType =
    Variant__code__String__message__String_____Unit_NullType.create(NullType.NULL)

  private val mainHandler = Handler(Looper.getMainLooper())
  private val running = AtomicBoolean(false)
  private var recorder: AudioRecord? = null
  private var thread: Thread? = null

  override fun start(sampleRate: Double) {
    if (running.get()) return
    val rate = sampleRate.toInt().coerceAtLeast(8000)

    val size = AudioRecord.getMinBufferSize(
      rate,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
    )

    val record = try {
      AudioRecord(
        MediaRecorder.AudioSource.VOICE_RECOGNITION,
        rate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        size * 4,
      )
    } catch (e: Exception) {
      emitError("MIC_UNAVAILABLE", "Microphone unavailable")
      return
    }

    if (record.state != AudioRecord.STATE_INITIALIZED) {
      emitError("MIC_PERMISSION_DENIED", "Microphone permission denied")
      record.release()
      return
    }

    recorder = record
    running.set(true)
    record.startRecording()

    thread = Thread {
      val buffer = ShortArray(size / 2)
      while (running.get()) {
        val read = record.read(buffer, 0, buffer.size, AudioRecord.READ_NON_BLOCKING)
        if (read <= 0) {
          Thread.sleep(5)
          continue
        }
        val bytes = ByteArray(read * 2)
        var i = 0
        while (i < read) {
          val s = buffer[i]
          bytes[i * 2] = (s.toInt() and 0xFF).toByte()
          bytes[i * 2 + 1] = ((s.toInt() shr 8) and 0xFF).toByte()
          i += 1
        }
        val chunk = ArrayBuffer.copy(bytes)
        mainHandler.post { onData.asFirstOrNull()?.invoke(Variant_NullType_ArrayBuffer.create(chunk)) }
      }
    }.apply {
      isDaemon = true
      start()
    }
  }

  override fun stop() {
    if (!running.getAndSet(false)) return
    val record = recorder
    recorder = null
    runCatching { record?.stop() }
    runCatching { record?.release() }
    thread?.join(500)
    thread = null
    mainHandler.post { onData.asFirstOrNull()?.invoke(Variant_NullType_ArrayBuffer.create(NullType.NULL)) }
  }

  private fun emitError(code: String, message: String) {
    mainHandler.post { onError.asFirstOrNull()?.invoke(code, message) }
  }
}