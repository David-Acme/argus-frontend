package com.davidacme.argus.push

import android.content.Context
import android.util.Base64
import com.google.crypto.tink.BinaryKeysetWriter
import com.google.crypto.tink.CleartextKeysetHandle
import com.google.crypto.tink.HybridDecrypt
import com.google.crypto.tink.KeyTemplate
import com.google.crypto.tink.KeysetHandle
import com.google.crypto.tink.hybrid.HpkeParameters
import com.google.crypto.tink.hybrid.HybridConfig
import com.google.crypto.tink.integration.android.AndroidKeysetManager
import com.google.crypto.tink.proto.HpkePublicKey
import com.google.crypto.tink.proto.Keyset
import java.io.ByteArrayOutputStream
import java.security.MessageDigest

internal class PushKeys(context: Context) {
    private val appContext = context.applicationContext

    fun ensure() {
        handle()
    }

    fun publicKey(): ByteArray = rawPublicKey(handle().publicKeysetHandle)

    fun hybridDecrypt(): HybridDecrypt {
        HybridConfig.register()
        return handle().getPrimitive(HybridDecrypt::class.java)
    }

    fun keyId(): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(publicKey())
        return Base64.encodeToString(digest.copyOf(KEY_ID_BYTES), BASE64URL)
    }

    fun delete() {
        appContext.getSharedPreferences(KEYSET_PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }

    private fun handle(): KeysetHandle =
        AndroidKeysetManager.Builder()
            .withSharedPref(appContext, KEYSET_NAME, KEYSET_PREFS)
            .withKeyTemplate(hpkeKeyTemplate())
            .withMasterKeyUri(MASTER_KEY_URI)
            .build()
            .keysetHandle

    private fun rawPublicKey(publicHandle: KeysetHandle): ByteArray {
        val out = ByteArrayOutputStream()
        CleartextKeysetHandle.write(publicHandle, BinaryKeysetWriter.withOutputStream(out))
        val keyset = Keyset.parseFrom(out.toByteArray())
        val hpke = HpkePublicKey.parseFrom(keyset.getKey(0).keyData.value)
        return hpke.publicKey.toByteArray()
    }

    companion object {
        init {
            HybridConfig.register()
        }

        const val BASE64URL = Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
        private const val KEY_ID_BYTES = 16
        private const val KEYSET_NAME = "argus_push_keyset"
        private const val KEYSET_PREFS = "argus_push_keyset_prefs"
        private const val MASTER_KEY_URI = "android-keystore://argus_push_master_key"

            internal fun hpkeKeyTemplate(): KeyTemplate =
                KeyTemplate.createFrom(
                    HpkeParameters.builder()
                        .setKemId(HpkeParameters.KemId.DHKEM_X25519_HKDF_SHA256)
                        .setKdfId(HpkeParameters.KdfId.HKDF_SHA256)
                        .setAeadId(HpkeParameters.AeadId.CHACHA20_POLY1305)
                        .setVariant(HpkeParameters.Variant.NO_PREFIX)
                        .build()
                )
    }
}
