package com.davidacme.argus.push

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class HangupRouteTest {
    @Test
    fun anAnsweredCallIsHungUpByTheAppSoTheServerHearsIt() {
        assertTrue(hangupHandledByApp(answeredCallId = "call-7", ringing = false, listenerPresent = true))
    }

    @Test
    fun withoutTheAppListeningTheNativeSideEndsTheCallAtOnce() {
        assertFalse(hangupHandledByApp(answeredCallId = "call-7", ringing = false, listenerPresent = false))
    }

    @Test
    fun aRingingOrAbsentCallIsEndedNatively() {
        assertFalse(hangupHandledByApp(answeredCallId = "call-7", ringing = true, listenerPresent = true))
        assertFalse(hangupHandledByApp(answeredCallId = null, ringing = false, listenerPresent = true))
    }

    @Test
    fun theDeferredHangupIsTraced() {
        assertTrue(NativeTrace.line("telecom", "queued", "hangup-by-app") != null)
    }
}
