package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CallEndPlanTest {
    @Test
    fun aCancelOfTheRingingCallStopsTheRingerFinishesTheScreenAndCancelsItsNotification() {
        val plan = CallEndPlan.forEnd(wasRinging = true, callId = "call-79")

        assertTrue(plan.stopRinger)
        assertTrue(plan.finishScreen)
        assertEquals("call-call-79", plan.notificationTag)
        assertEquals(2, plan.notificationId)
    }

    @Test
    fun aCancelOfACallThatIsNotRingingStillFinishesTheScreenAndCancelsItsNotification() {
        val plan = CallEndPlan.forEnd(wasRinging = false, callId = "call-76")

        assertFalse(plan.stopRinger)
        assertTrue(plan.finishScreen)
        assertEquals("call-call-76", plan.notificationTag)
        assertEquals(2, plan.notificationId)
    }
}
