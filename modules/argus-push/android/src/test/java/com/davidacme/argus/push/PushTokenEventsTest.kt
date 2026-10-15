package com.davidacme.argus.push

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test

class PushTokenEventsTest {
    @After
    fun unbind() {
        PushTokenEvents.listener = null
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
    }

    @Test
    fun aListenerThatFailsDoesNotFailTheRotation() {
        PushTokenEvents.listener = { throw IllegalStateException("no JS runtime") }
        PushTokenEvents.rotated("rotated-token-3")
    }
}
