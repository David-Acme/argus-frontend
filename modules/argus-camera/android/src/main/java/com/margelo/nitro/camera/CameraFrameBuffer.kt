package com.margelo.nitro.camera

import androidx.media3.common.C
import java.util.ArrayDeque
import java.util.concurrent.locks.ReentrantLock
import kotlin.concurrent.withLock

/** Byte stream shared between the JS pump and the ExoPlayer loader thread. */
internal class CameraFrameBuffer {
  private val lock = ReentrantLock()
  private val notEmpty = lock.newCondition()
  private val chunks = ArrayDeque<ByteArray>()
  private var headOffset = 0
  private var bytes = 0
  private var closed = false

  fun restart(init: ByteArray) {
    lock.withLock {
      chunks.clear()
      headOffset = 0
      bytes = 0
      closed = false
      chunks.addLast(init)
      bytes += init.size
      notEmpty.signalAll()
    }
  }

  fun append(chunk: ByteArray) {
    lock.withLock {
      if (closed)
        return
      chunks.addLast(chunk)
      bytes += chunk.size
      notEmpty.signalAll()
    }
  }

  fun abort() {
    lock.withLock {
      closed = true
      notEmpty.signalAll()
    }
  }

  /** Blocks until bytes are available or the stream is aborted. */
  fun read(out: ByteArray, offset: Int, length: Int): Int {
    lock.withLock {
      while (bytes == 0 && !closed)
        notEmpty.await()
      if (bytes == 0)
        return C.RESULT_END_OF_INPUT
      val first = chunks.first()
      val count = minOf(length, first.size - headOffset)
      System.arraycopy(first, headOffset, out, offset, count)
      headOffset += count
      bytes -= count
      if (headOffset == first.size) {
        chunks.removeFirst()
        headOffset = 0
      }
      return count
    }
  }

  fun availableBytes(): Int = lock.withLock { bytes }
}
