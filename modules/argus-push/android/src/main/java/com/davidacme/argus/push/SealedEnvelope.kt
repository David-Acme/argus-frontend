package com.davidacme.argus.push

import java.nio.BufferUnderflowException
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.StandardCharsets

internal class SealedEnvelope(
    val deliveryId: ByteArray,
    val provider: Int,
    val kind: Int,
    val priority: Int,
    val ttlSeconds: Long,
    val collapseId: String,
    val token: String,
    val enc: ByteArray,
    val ciphertext: ByteArray,
    val associatedData: ByteArray,
) {
    val isCall: Boolean get() = kind == KIND_CALL

    companion object {
        const val PROVIDER_FCM = 1
        const val PROVIDER_APNS = 2
        const val PROVIDER_APNS_VOIP = 3
        const val KIND_ALERT = 1
        const val KIND_CALL = 2

        private const val DELIVERY_ID_BYTES = 16
        private const val MAX_COLLAPSE_ID_BYTES = 64
        private const val MAX_TOKEN_BYTES = 512
        private const val ENC_BYTES = 32
        private const val MIN_CIPHERTEXT_BYTES = 16
        private const val MAX_CIPHERTEXT_BYTES = 2048
        private const val PRIORITY_HIGH = 1
        private const val PRIORITY_NORMAL = 0

        fun parse(payload: ByteArray): SealedEnvelope? =
            try {
                parseFields(payload)
            } catch (error: BufferUnderflowException) {
                null
            }

        private fun parseFields(payload: ByteArray): SealedEnvelope? {
            val buffer = ByteBuffer.wrap(payload).order(ByteOrder.LITTLE_ENDIAN)
            val deliveryId = buffer.bytes(DELIVERY_ID_BYTES)
            val provider = buffer.unsignedByte()
            val kind = buffer.unsignedByte()
            val priority = buffer.unsignedByte()
            val ttlSeconds = buffer.getInt().toLong() and 0xFFFFFFFFL
            val collapseLength = buffer.unsignedByte()
            if (collapseLength > MAX_COLLAPSE_ID_BYTES) return null
            val collapseId = String(buffer.bytes(collapseLength), StandardCharsets.UTF_8)
            val tokenLength = buffer.unsignedShort()
            if (tokenLength !in 1..MAX_TOKEN_BYTES) return null
            val token = String(buffer.bytes(tokenLength), StandardCharsets.UTF_8)
            val associatedDataEnd = buffer.position()
            if (buffer.unsignedShort() != ENC_BYTES) return null
            val enc = buffer.bytes(ENC_BYTES)
            val ciphertextLength = buffer.unsignedShort()
            if (ciphertextLength !in MIN_CIPHERTEXT_BYTES..MAX_CIPHERTEXT_BYTES) return null
            val ciphertext = buffer.bytes(ciphertextLength)
            if (buffer.hasRemaining()) return null
            if (priority != PRIORITY_NORMAL && priority != PRIORITY_HIGH) return null
            if (!providerKindAllowed(provider, kind)) return null
            return SealedEnvelope(
                deliveryId = deliveryId,
                provider = provider,
                kind = kind,
                priority = priority,
                ttlSeconds = ttlSeconds,
                collapseId = collapseId,
                token = token,
                enc = enc,
                ciphertext = ciphertext,
                associatedData = payload.copyOfRange(0, associatedDataEnd),
            )
        }

        private fun providerKindAllowed(provider: Int, kind: Int): Boolean =
            when (provider) {
                PROVIDER_FCM -> kind == KIND_ALERT || kind == KIND_CALL
                PROVIDER_APNS -> kind == KIND_ALERT
                PROVIDER_APNS_VOIP -> kind == KIND_CALL
                else -> false
            }

        private fun ByteBuffer.unsignedByte(): Int = get().toInt() and 0xFF

        private fun ByteBuffer.unsignedShort(): Int = getShort().toInt() and 0xFFFF

        private fun ByteBuffer.bytes(count: Int): ByteArray = ByteArray(count).also { get(it) }
    }
}
