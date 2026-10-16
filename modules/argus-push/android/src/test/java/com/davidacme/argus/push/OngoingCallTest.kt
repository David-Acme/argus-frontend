package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class OngoingCallTest {
    @Test
    fun theHangUpActionEndsTheOngoingCallAndNothingElseDoes() {
        assertEquals(OngoingCallAction.HangUp, ongoingCallActionOf(PushActions.ACTION_HANG_UP))
        assertNull(ongoingCallActionOf(PushActions.ACTION_DECLINE))
        assertNull(ongoingCallActionOf(null))
    }

    @Test
    fun theOngoingCallIsAlwaysRunByTheForegroundServiceNeverPostedDirectly() {
        assertEquals(OngoingCallRoute.ForegroundService, ongoingCallRoute())
    }

    @Test
    fun theOngoingServiceRunsOnlyWhileTheAnsweredCallIsNotEnded() {
        assertEquals(true, shouldRunOngoingService(answered = true, ended = false))
        assertEquals(false, shouldRunOngoingService(answered = true, ended = true))
        assertEquals(false, shouldRunOngoingService(answered = false, ended = false))
    }

    @Test
    fun theOngoingCallPostsOnTheChannelThatTheChannelSetupCreates() {
        assertEquals(PushChannels.CALLS, ongoingCallChannel())
    }

    @Test
    fun aCallStyleOngoingNotificationAlwaysCarriesAFullScreenIntent() {
        assertEquals(true, ongoingFullScreenIntent(ongoingCallStyle(34)))
        assertEquals(false, ongoingCallStyle(29))
        assertEquals(false, ongoingFullScreenIntent(ongoingCallStyle(29)))
    }

    @Test
    fun theOngoingCallCopyFollowsTheDeviceLanguage() {
        assertEquals(OngoingCallCopy("Llamada en curso", "Colgar"), ongoingCallCopy(spanish = true))
        assertEquals(OngoingCallCopy("Call in progress", "Hang up"), ongoingCallCopy(spanish = false))
    }
}
