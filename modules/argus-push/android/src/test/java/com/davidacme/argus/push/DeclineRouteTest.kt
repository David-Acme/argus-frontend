package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Test

class DeclineRouteTest {
    @Test
    fun aDeclineGoesThroughTheAppListenerWhenTheAppIsRunning() {
        assertEquals(DeclineRoute.Listener, declineRouteOf(listenerPresent = true))
    }

    @Test
    fun aDeclineWithoutTheAppRunningStartsTheHeadlessTask() {
        assertEquals(DeclineRoute.Headless, declineRouteOf(listenerPresent = false))
    }

    @Test
    fun theHeadlessTaskHasAFixedNameAndADeadline() {
        assertEquals("ArgusDecline", DECLINE_TASK_NAME)
        assertEquals(10_000L, DECLINE_TASK_TIMEOUT_MS)
    }
}
