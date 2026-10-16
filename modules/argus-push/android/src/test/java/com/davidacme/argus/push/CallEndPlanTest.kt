package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class CallEndPlanTest {
    @Test
    fun aCancelOfTheRingingCallStopsTheRingerFinishesTheScreenAndCancelsTheCallNotification() {
        val plan = CallEndPlan.forEnd(wasRinging = true, answered = false)

        assertTrue(plan.stopRinger)
        assertTrue(plan.finishScreen)
        assertTrue(plan.cancelNotification)
        assertEquals(OngoingCall.ID, plan.notificationId)
    }

    @Test
    fun anAnsweredCallKeepsItsCallNotificationSoTheOngoingCallReplacesItWithoutAGap() {
        val plan = CallEndPlan.forEnd(wasRinging = true, answered = true)

        assertTrue(plan.stopRinger)
        assertFalse(plan.cancelNotification)
        assertEquals(OngoingCall.ID, plan.notificationId)
    }

    @Test
    fun aCancelOfACallThatIsNotRingingStillFinishesTheScreenAndCancelsTheCallNotification() {
        val plan = CallEndPlan.forEnd(wasRinging = false, answered = false)

        assertFalse(plan.stopRinger)
        assertTrue(plan.finishScreen)
        assertTrue(plan.cancelNotification)
    }
}
