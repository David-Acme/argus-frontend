package com.davidacme.argus.push

import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.StandardCharsets
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SealedEnvelopeTest {
    private val fcmCall = hex(
        "000102030405060708090a0b0c0d0e0f0102013c0000000963616c6c2d30303031130066636d2d746573742d746f6b656e2d3030303120003ace5bee03a93f764e89574e2bb48dcb9a7e136f52225f7788224082496e981ca40005d8dd58c07e3b95d8c4b5ddcc0f4f3f8693bf14665ed3d6c09a8e8fd81f0c426d9fee508ee457c891fb4a26231fcf83753313853206410c210ce754a60a1bb6b07f967a6aebd3fdda1bb92c7a553f5c1b5d5566e15f5f86ab931dee8614e2b7b47cb1a1482c2586f092c89645f06bd00fe393d9faf8c267fac916fc885f31ef537d4017fe733834f77be44679788f9c580b68c84008aa2448647153233728f953f38cf9",
    )

    @Test
    fun parsesTheCloudFcmCallVector() {
        val envelope = requireNotNull(SealedEnvelope.parse(fcmCall))
        assertEquals(SealedEnvelope.PROVIDER_FCM, envelope.provider)
        assertEquals(SealedEnvelope.KIND_CALL, envelope.kind)
        assertEquals(1, envelope.priority)
        assertEquals(60L, envelope.ttlSeconds)
        assertEquals("call-0001", envelope.collapseId)
        assertEquals("fcm-test-token-0001", envelope.token)
        assertArrayEquals(hex("3ace5bee03a93f764e89574e2bb48dcb9a7e136f52225f7788224082496e981c"), envelope.enc)
        assertEquals(164, envelope.ciphertext.size)
        assertEquals(54, envelope.associatedData.size)
        assertArrayEquals(fcmCall.copyOfRange(0, 54), envelope.associatedData)
    }

    @Test
    fun parsesA255CharacterAsciiTokenBuiltInTheTest() {
        val token = "t".repeat(255)
        val payload = ByteBuffer.allocate(16 + 1 + 1 + 1 + 4 + 1 + 2 + token.length + 2 + 32 + 2 + 16)
            .order(ByteOrder.LITTLE_ENDIAN)
            .put(ByteArray(16))
            .put(1.toByte())
            .put(2.toByte())
            .put(1.toByte())
            .putInt(60)
            .put(0.toByte())
            .putShort(token.length.toShort())
            .put(token.toByteArray(StandardCharsets.US_ASCII))
            .putShort(32.toShort())
            .put(ByteArray(32))
            .putShort(16.toShort())
            .put(ByteArray(16))
            .array()
        val envelope = requireNotNull(SealedEnvelope.parse(payload))
        assertEquals(token, envelope.token)
        assertEquals(255, envelope.token.length)
    }

    @Test
    fun refusesTrailingBytes() {
        assertNull(SealedEnvelope.parse(fcmCall + byteArrayOf(0)))
    }

    @Test
    fun refusesTruncatedPayload() {
        assertNull(SealedEnvelope.parse(fcmCall.copyOfRange(0, 40)))
    }

    @Test
    fun refusesUnknownPriority() {
        val payload = fcmCall.copyOf()
        payload[18] = 2
        assertNull(SealedEnvelope.parse(payload))
    }

    @Test
    fun refusesApnsCallPairing() {
        val payload = fcmCall.copyOf()
        payload[16] = 2
        assertNull(SealedEnvelope.parse(payload))
    }

    private fun hex(text: String): ByteArray =
        ByteArray(text.length / 2) { index -> text.substring(index * 2, index * 2 + 2).toInt(16).toByte() }
}
