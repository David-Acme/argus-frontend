package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Test

class RealarmDecisionTest {
    @Test
    fun aRingThatStartedSkipsTheRealarm() {
        assertEquals(RealarmAction.Skip, RealarmDecision.decide("guard:panic:7", ringStarted = true))
    }

    @Test
    fun aRingThatNeverStartedRealarms() {
        assertEquals(RealarmAction.Realarm, RealarmDecision.decide("guard:panic:7", ringStarted = false))
    }

    @Test
    fun anAlertWithoutAnEpisodeSkipsTheRealarm() {
        assertEquals(RealarmAction.Skip, RealarmDecision.decide("", ringStarted = false))
    }

    @Test
    fun theRealarmFiresTheGraceAfterTheSilentPost() {
        assertEquals(1_008_000L, RealarmDecision.triggerAtMillis(1_000_000L))
    }
}
