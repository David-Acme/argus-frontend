package com.davidacme.argus.push

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class PushTokenEventsTest {
    private val warnings = mutableListOf<String>()

    @After
    fun unbind() {
        PushTokenEvents.listener = null
        PushLog.sink = { message -> android.util.Log.w(PushLog.TAG, message) }
    }

    @Test
    fun aRotationDeliversTheNewTokenOnceToTheBoundListener() {
        val delivered = mutableListOf<String>()
        PushTokenEvents.listener = { delivered.add(it) }
        PushTokenEvents.rotated("rotated-token-1")
        assertEquals(listOf("rotated-token-1"), delivered)
    }

    @Test
    fun aRotationWithNoListenerIsANoOp() {
        PushTokenEvents.listener = null
        PushTokenEvents.rotated("rotated-token-2")
        assertEquals(emptyList<String>(), warnings)
    }

    @Test
    fun aListenerThatFailsDoesNotFailTheRotation() {
        PushLog.sink = { warnings.add(it) }
        PushTokenEvents.listener = { throw IllegalStateException("no JS runtime") }
        PushTokenEvents.rotated("rotated-token-3")
        assertEquals(1, warnings.size)
        assertFalse(warnings.single().contains("rotated-token-3"))
    }
}
