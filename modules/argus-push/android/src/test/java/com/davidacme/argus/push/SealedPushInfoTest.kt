package com.davidacme.argus.push

import org.junit.Assert.assertArrayEquals
import org.junit.Test

class SealedPushInfoTest {
    @Test
    fun infoIsLabelKeyIdAndPrefixWithNulSeparators() {
        val prefix = byteArrayOf(0x0A, 0x0B)
        val expected = "argus.push.v1".toByteArray(Charsets.US_ASCII) +
            byteArrayOf(0) +
            "key-1".toByteArray(Charsets.US_ASCII) +
            byteArrayOf(0) +
            prefix
        assertArrayEquals(expected, SealedPushInfo.build("key-1", prefix))
    }
}
