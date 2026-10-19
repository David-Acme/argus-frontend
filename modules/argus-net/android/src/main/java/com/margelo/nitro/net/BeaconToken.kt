package com.margelo.nitro.net

import java.nio.ByteBuffer
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

internal object BeaconToken {
  private const val ALGORITHM = "HmacSHA256"
  private const val TOKEN_BYTES = 16

  private const val ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

  fun seedBytes(seed: String): ByteArray? = decodeBase64(seed.trim())?.takeIf { it.size >= TOKEN_BYTES }

  private fun decodeBase64(text: String): ByteArray? {
    if (text.isEmpty() || text.length % 4 != 0) return null
    val body = text.trimEnd('=')
    if (text.length - body.length > 2) return null
    val out = java.io.ByteArrayOutputStream(body.length * 3 / 4)
    var buffer = 0
    var bits = 0
    for (char in body) {
      val value = ALPHABET.indexOf(char)
      if (value < 0) return null
      buffer = ((buffer shl 6) or value) and 0xFFFF
      bits += 6
      if (bits >= 8) {
        bits -= 8
        out.write((buffer shr bits) and 0xFF)
      }
    }
    return out.toByteArray()
  }

  fun counter(nowSeconds: Long, rotateSeconds: Long): Long = nowSeconds.floorDiv(rotateSeconds.coerceAtLeast(1L))

  fun uuid(seed: ByteArray, counter: Long): UUID {
    val mac = Mac.getInstance(ALGORITHM)
    mac.init(SecretKeySpec(seed, ALGORITHM))
    val digest = mac.doFinal(ByteBuffer.allocate(Long.SIZE_BYTES).putLong(counter).array())
    val token = ByteBuffer.wrap(digest, 0, TOKEN_BYTES)
    return UUID(token.long, token.long)
  }

  fun millisToNextRotation(nowMillis: Long, rotateSeconds: Long): Long {
    val period = rotateSeconds.coerceAtLeast(1L) * 1000L
    return period - nowMillis.mod(period)
  }
}
