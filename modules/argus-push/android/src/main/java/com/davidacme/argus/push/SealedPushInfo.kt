package com.davidacme.argus.push

internal object SealedPushInfo {
    private val separator = byteArrayOf(0)
    private const val LABEL = "argus.push.v1"

    fun build(keyId: String, envelopePrefix: ByteArray): ByteArray =
        LABEL.toByteArray(Charsets.US_ASCII) + separator + keyId.toByteArray(Charsets.US_ASCII) + separator + envelopePrefix
}
