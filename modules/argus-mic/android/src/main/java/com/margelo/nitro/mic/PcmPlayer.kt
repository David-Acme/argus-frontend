package com.margelo.nitro.mic

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

class PcmPlayer(
  private val onIdle: () -> Unit,
  private val onFailure: (String, String) -> Unit,
) {
  private class Chunk(val generation: Long, val samples: ShortArray)

  private val queue = LinkedBlockingQueue<Chunk>()
  private val trackLock = ReentrantLock(true)
  private val stateLock = Any()
  @Volatile private var running = false
  @Volatile private var generation = 0L
  private var track: AudioTrack? = null
  private var thread: Thread? = null
  private var sampleRate = 16000
  private var writtenFrames = 0L
  private var consumedBase = 0L
  private var headOffset = 0L
  private var trackFrames = 0L
  private var foldedPadding = 0L
  private val pads = ArrayDeque<LongArray>()
  private var idlePending = false
  private var paddedSinceWrite = false

  val isRunning: Boolean
    get() = running

  fun start(rate: Int, sessionId: Int?): Boolean {
    if (running) return true
    sampleRate = rate
    val minSize = AudioTrack.getMinBufferSize(rate, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
    if (minSize <= 0) {
      onFailure("PLAYER_UNAVAILABLE", "Playback format unsupported")
      return false
    }
    val created = try {
      AudioTrack(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build(),
        AudioFormat.Builder()
          .setSampleRate(rate)
          .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
          .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
          .build(),
        maxOf(minSize * 2, rate / 10 * BYTES_PER_SAMPLE),
        AudioTrack.MODE_STREAM,
        sessionId ?: AudioManager.AUDIO_SESSION_ID_GENERATE,
      )
    } catch (e: Exception) {
      onFailure("PLAYER_UNAVAILABLE", "Speaker unavailable")
      return false
    }
    if (created.state != AudioTrack.STATE_INITIALIZED) {
      created.release()
      onFailure("PLAYER_UNAVAILABLE", "Speaker unavailable")
      return false
    }
    runCatching { created.play() }
    synchronized(stateLock) {
      writtenFrames = 0L
      consumedBase = 0L
      headOffset = created.playbackHeadPosition.toLong() and HEAD_MASK
      resetTimelineLocked()
      idlePending = false
      paddedSinceWrite = false
    }
    queue.clear()
    track = created
    running = true
    thread = Thread({ writeLoop(created) }, "argus-mic-player").apply {
      isDaemon = true
      priority = Thread.MAX_PRIORITY
      start()
    }
    return true
  }

  fun write(samples: ShortArray) {
    if (!running || samples.isEmpty()) return
    synchronized(stateLock) {
      writtenFrames += samples.size
      idlePending = true
      paddedSinceWrite = false
    }
    queue.offer(Chunk(generation, samples))
  }

  fun flush() {
    if (!running) return
    generation += 1
    queue.clear()
    val current = track ?: return
    runCatching { current.pause() }
    trackLock.withLock {
      runCatching { current.flush() }
      synchronized(stateLock) {
        consumedBase = writtenFrames
        headOffset = current.playbackHeadPosition.toLong() and HEAD_MASK
        resetTimelineLocked()
        idlePending = false
      }
      runCatching { current.play() }
    }
  }

  fun stop() {
    if (!running) return
    running = false
    generation += 1
    queue.clear()
    val current = track
    track = null
    runCatching { current?.pause() }
    thread?.interrupt()
    thread?.join(JOIN_TIMEOUT_MS)
    thread = null
    runCatching { current?.flush() }
    runCatching { current?.stop() }
    runCatching { current?.release() }
  }

  fun playedFrames(): Long {
    val current = track ?: return synchronized(stateLock) { writtenFrames }
    return synchronized(stateLock) { playedLocked(current) }
  }

  private fun playedLocked(current: AudioTrack): Long {
    val head = runCatching { current.playbackHeadPosition.toLong() and HEAD_MASK }.getOrDefault(headOffset)
    val advanced = (head - headOffset).coerceIn(0L, trackFrames)
    while (pads.isNotEmpty() && pads.first()[0] + pads.first()[1] <= advanced) {
      foldedPadding += pads.removeFirst()[1]
    }
    val partialPadding = pads.sumOf { (advanced - it[0]).coerceIn(0L, it[1]) }
    val real = advanced - foldedPadding - partialPadding
    return (consumedBase + real).coerceIn(consumedBase, writtenFrames)
  }

  private fun resetTimelineLocked() {
    trackFrames = 0L
    foldedPadding = 0L
    pads.clear()
  }

  private fun writeLoop(current: AudioTrack) {
    var lastPlayed = -1L
    var stalledPolls = 0
    while (running) {
      val chunk = try {
        queue.poll(POLL_MS, TimeUnit.MILLISECONDS)
      } catch (e: InterruptedException) {
        return
      }
      if (chunk != null) {
        writeChunk(current, chunk)
        stalledPolls = 0
        continue
      }
      val (played, pending, padded) = synchronized(stateLock) {
        Triple(playedLocked(current), idlePending, paddedSinceWrite)
      }
      if (!pending) continue
      val written = synchronized(stateLock) { writtenFrames }
      if (played >= written) {
        val fire = synchronized(stateLock) {
          val wasPending = idlePending && writtenFrames == written
          if (wasPending) idlePending = false
          wasPending
        }
        if (fire) onIdle()
        stalledPolls = 0
        continue
      }
      stalledPolls = if (played == lastPlayed) stalledPolls + 1 else 0
      lastPlayed = played
      if (stalledPolls >= STALL_POLLS && !padded) {
        pad(current)
        stalledPolls = 0
      }
    }
  }

  private fun writeChunk(current: AudioTrack, chunk: Chunk) {
    var offset = 0
    while (offset < chunk.samples.size && running) {
      val wrote = trackLock.withLock {
        if (chunk.generation != generation) return
        val length = minOf(chunk.samples.size - offset, sampleRate / SLICES_PER_SECOND)
        val count = current.write(chunk.samples, offset, length, AudioTrack.WRITE_BLOCKING)
        if (count > 0) synchronized(stateLock) { trackFrames += count }
        count
      }
      if (wrote < 0) {
        onFailure("PLAYER_UNAVAILABLE", "Playback write failed ($wrote)")
        return
      }
      offset += wrote
    }
  }

  private fun pad(current: AudioTrack) {
    val silence = ShortArray(maxOf(current.bufferSizeInFrames, sampleRate / SLICES_PER_SECOND))
    synchronized(stateLock) { paddedSinceWrite = true }
    val padGeneration = generation
    trackLock.withLock {
      if (padGeneration != generation) return
      val count = current.write(silence, 0, silence.size, AudioTrack.WRITE_NON_BLOCKING)
      if (count > 0) synchronized(stateLock) {
        pads.addLast(longArrayOf(trackFrames, count.toLong()))
        trackFrames += count
      }
    }
  }

  companion object {
    private const val BYTES_PER_SAMPLE = 2
    private const val SLICES_PER_SECOND = 50
    private const val POLL_MS = 20L
    private const val STALL_POLLS = 3
    private const val JOIN_TIMEOUT_MS = 500L
    private const val HEAD_MASK = 0xFFFFFFFFL
  }
}
