package com.davidacme.argus.push

import com.google.crypto.tink.BinaryKeysetReader
import com.google.crypto.tink.CleartextKeysetHandle
import com.google.crypto.tink.HybridDecrypt
import com.google.crypto.tink.hybrid.HybridConfig
import com.google.crypto.tink.proto.HpkeAead
import com.google.crypto.tink.proto.HpkeKdf
import com.google.crypto.tink.proto.HpkeKem
import com.google.crypto.tink.proto.HpkeParams
import com.google.crypto.tink.proto.HpkePrivateKey
import com.google.crypto.tink.proto.HpkePublicKey
import com.google.crypto.tink.proto.KeyData
import com.google.crypto.tink.proto.KeyStatusType
import com.google.crypto.tink.proto.Keyset
import com.google.crypto.tink.proto.OutputPrefixType
import com.google.protobuf.ByteString
import org.json.JSONObject
import org.junit.Assert.assertArrayEquals
import org.junit.Ignore
import org.junit.Test

class SealedPushOpenerTest {
    @Ignore("waiting: the cloud's regenerated push-sealed.json lands on the cloud track; copy it to src/test/resources and remove this")
    @Test
    fun opensTheCloudSealedVector() {
        HybridConfig.register()
        val file = JSONObject(javaClass.getResource("/push-sealed.json")!!.readText())
        val sealing = file.getJSONObject("sealing")
        val vector = file.getJSONArray("vectors").getJSONObject(0)
        val decrypt = recipientDecrypt(
            hex(sealing.getString("recipientPrivateHex")),
            hex(sealing.getString("recipientPublicHex")),
        )
        val envelope = assertNotNullEnvelope(hex(vector.getString("payloadHex")))
        val opened = SealedPushOpener(decrypt, sealing.getString("keyId")).open(envelope)
        assertArrayEquals(hex(sealing.getString("plaintextHex")), opened)
    }

    private fun assertNotNullEnvelope(payload: ByteArray): SealedEnvelope =
        requireNotNull(SealedEnvelope.parse(payload))

    private fun recipientDecrypt(privateKey: ByteArray, publicKey: ByteArray): HybridDecrypt {
        val params = HpkeParams.newBuilder()
            .setKem(HpkeKem.DHKEM_X25519_HKDF_SHA256)
            .setKdf(HpkeKdf.HKDF_SHA256)
            .setAead(HpkeAead.CHACHA20_POLY1305)
            .build()
        val public = HpkePublicKey.newBuilder()
            .setVersion(0)
            .setParams(params)
            .setPublicKey(ByteString.copyFrom(publicKey))
            .build()
        val private = HpkePrivateKey.newBuilder()
            .setVersion(0)
            .setPublicKey(public)
            .setPrivateKey(ByteString.copyFrom(privateKey))
            .build()
        val keyData = KeyData.newBuilder()
            .setTypeUrl("type.googleapis.com/google.crypto.tink.HpkePrivateKey")
            .setValue(private.toByteString())
            .setKeyMaterialType(KeyData.KeyMaterialType.ASYMMETRIC_PRIVATE)
            .build()
        val key = Keyset.Key.newBuilder()
            .setKeyId(1)
            .setStatus(KeyStatusType.ENABLED)
            .setOutputPrefixType(OutputPrefixType.RAW)
            .setKeyData(keyData)
            .build()
        val keyset = Keyset.newBuilder().setPrimaryKeyId(1).addKey(key).build()
        return CleartextKeysetHandle.read(BinaryKeysetReader.withBytes(keyset.toByteArray()))
            .getPrimitive(HybridDecrypt::class.java)
    }

    private fun hex(text: String): ByteArray =
        ByteArray(text.length / 2) { index -> text.substring(index * 2, index * 2 + 2).toInt(16).toByte() }
}
