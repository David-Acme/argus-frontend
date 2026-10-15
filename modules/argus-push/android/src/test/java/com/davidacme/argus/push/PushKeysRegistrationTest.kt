package com.davidacme.argus.push

import com.google.crypto.tink.KeysetHandle
import org.junit.Assert.assertNotNull
import org.junit.Test

class PushKeysRegistrationTest {
    @Test
    fun theKeysetTemplateCreatesKeysAfterTheModuleInitializesWithoutAnyDecrypt() {
        Class.forName(PushKeys::class.java.name)
        val handle = KeysetHandle.generateNew(PushKeys.hpkeKeyTemplate())
        assertNotNull(handle.publicKeysetHandle)
    }
}
