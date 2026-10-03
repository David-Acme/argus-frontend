package com.margelo.nitro.mic

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.AudioEffect
import android.media.audiofx.AutomaticGainControl
import android.media.audiofx.NoiseSuppressor
import java.util.concurrent.atomic.AtomicBoolean

class PcmCapture(
  private val onChunk: (ByteArray) -> Unit,
  private val onFailure: (String, String) -> Unit,
) {
  private val running = AtomicBoolean(false)
  private var recorder: AudioRecord? = null
  private var thread: Thread? = null
  private val effects = mutableListOf<AudioEffect>()

  val isRunning: Boolean
    get() = running.get()

  val sessionId: Int?
    get() = recorder?.audioSessionId

  fun start(sampleRate: Int): Boolean {
    if (running.get()) return true
    val minSize = AudioRecord.getMinBufferSize(sampleRate, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT)
    if (minSize <= 0) {
      onFailure("MIC_UNAVAILABLE", "Microphone format unsupported")
      return false
    }
    val frameBytes = sampleRate / FRAMES_PER_SECOND * BYTES_PER_SAMPLE
    val record = try {
      AudioRecord(
        MediaRecorder.AudioSource.VOICE_COMMUNICATION,
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        maxOf(minSize * 4, frameBytes * 8),
      )
    } catch (e: SecurityException) {
      onFailure("MIC_PERMISSION_DENIED", "Microphone permission denied")
      return false
    } catch (e: Exception) {
      onFailure("MIC_UNAVAILABLE", "Microphone unavailable")
      return false
    }
    if (record.state != AudioRecord.STATE_INITIALIZED) {
      record.release()
      onFailure("MIC_PERMISSION_DENIED", "Microphone permission denied")
      return false
    }
    attachEffects(record.audioSessionId)
    try {
      record.startRecording()
    } catch (e: Exception) {
      releaseEffects()
      record.release()
      onFailure("MIC_UNAVAILABLE", "Microphone unavailable")
      return false
    }
    recorder = record
    running.set(true)
    thread = Thread({ readLoop(record, frameBytes) }, "argus-mic-capture").apply {
      isDaemon = true
      priority = Thread.MAX_PRIORITY
      start()
    }
    return true
  }

  fun stop() {
    if (!running.getAndSet(false)) return
    val record = recorder
    recorder = null
    runCatching { record?.stop() }
    thread?.join(JOIN_TIMEOUT_MS)
    thread = null
    releaseEffects()
    runCatching { record?.release() }
  }

  private fun readLoop(record: AudioRecord, frameBytes: Int) {
    val buffer = ByteArray(frameBytes)
    while (running.get()) {
      val read = record.read(buffer, 0, buffer.size)
      if (read < 0) {
        if (running.get()) onFailure("MIC_UNAVAILABLE", "Microphone read failed ($read)")
        return
      }
      if (read > 0) onChunk(buffer.copyOf(read))
    }
  }

  private fun attachEffects(sessionId: Int) {
    if (AcousticEchoCanceler.isAvailable()) enable(runCatching { AcousticEchoCanceler.create(sessionId) }.getOrNull())
    if (NoiseSuppressor.isAvailable()) enable(runCatching { NoiseSuppressor.create(sessionId) }.getOrNull())
    if (AutomaticGainControl.isAvailable()) enable(runCatching { AutomaticGainControl.create(sessionId) }.getOrNull())
  }

  private fun enable(effect: AudioEffect?) {
    if (effect == null) return
    runCatching { effect.enabled = true }
    effects.add(effect)
  }

  private fun releaseEffects() {
    effects.forEach { runCatching { it.release() } }
    effects.clear()
  }

  companion object {
    private const val FRAMES_PER_SECOND = 50
    private const val BYTES_PER_SAMPLE = 2
    private const val JOIN_TIMEOUT_MS = 500L
  }
}
