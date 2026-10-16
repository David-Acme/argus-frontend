package com.davidacme.argus.push

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CallCancelTest {
    @Test
    fun aCancelForTheCallAnsweredHereDoesNotEndIt() {
        assertTrue(answeredCallMatches(answeredCallId = "call-114", callId = "call-114"))
        assertFalse(answeredCallMatches(answeredCallId = "call-114", callId = "call-115"))
        assertFalse(answeredCallMatches(answeredCallId = null, callId = "call-114"))
    }
}
