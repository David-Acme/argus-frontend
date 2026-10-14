package com.davidacme.argus.push

import com.google.crypto.tink.HybridDecrypt
import java.security.GeneralSecurityException

internal class SealedPushOpener(private val decrypt: HybridDecrypt, private val keyId: String) {
    fun open(envelope: SealedEnvelope): ByteArray? {
        val info = SealedPushInfo.build(keyId, envelope.associatedData)
        val sealed = envelope.enc + envelope.ciphertext
        return try {
            decrypt.decrypt(sealed, info)
        } catch (error: GeneralSecurityException) {
            null
        } catch (error: RuntimeException) {
            null
        }
    }
}
