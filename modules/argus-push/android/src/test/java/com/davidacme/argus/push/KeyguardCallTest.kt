package com.davidacme.argus.push

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KeyguardCallTest {
    @Test
    fun anOutsideAnswerShowsOverTheKeyguardUntilTheCallEnds() {
        assertTrue(KeyguardCall.showOverKeyguard(answeredFromOutside = true, ended = false))
        assertFalse(KeyguardCall.showOverKeyguard(answeredFromOutside = true, ended = true))
    }

    @Test
    fun anAnswerFromInsideTheAppNeverShowsOverTheKeyguard() {
        assertFalse(KeyguardCall.showOverKeyguard(answeredFromOutside = false, ended = false))
        assertFalse(KeyguardCall.showOverKeyguard(answeredFromOutside = false, ended = true))
    }

    @Test
    fun theLockAppliesToTheFirstAppActivityAfterAnOutsideAnswer() {
        assertTrue(KeyguardCall.shouldAttach(armed = true, intentExtra = false, isCallActivity = false))
        assertTrue(KeyguardCall.shouldAttach(armed = false, intentExtra = true, isCallActivity = false))
        assertFalse(KeyguardCall.shouldAttach(armed = true, intentExtra = true, isCallActivity = true))
        assertFalse(KeyguardCall.shouldAttach(armed = false, intentExtra = false, isCallActivity = false))
    }

    @Test
    fun theEndedStateStaysOverTheKeyguardForAShortHoldOnly() {
        assertTrue(KeyguardCall.ENDED_HOLD_MS in 2_000L..5_000L)
    }

    @Test
    fun aCallEndsOnlyTheLockItArmed() {
        assertTrue(KeyguardCall.disarmsFor(armedCallId = "call-1", callId = "call-1"))
        assertFalse(KeyguardCall.disarmsFor(armedCallId = "call-1", callId = "call-2"))
        assertFalse(KeyguardCall.disarmsFor(armedCallId = null, callId = "call-1"))
    }
}
