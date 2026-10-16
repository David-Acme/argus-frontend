package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class OngoingCallTest {
    @Test
    fun theOngoingCallActionsAreHangUpMuteAndSpeakerAndNothingElse() {
        assertEquals(OngoingCallAction.HangUp, ongoingCallActionOf(PushActions.ACTION_HANG_UP))
        assertEquals(OngoingCallAction.Mute, ongoingCallActionOf(PushActions.ACTION_MUTE))
        assertEquals(OngoingCallAction.Speaker, ongoingCallActionOf(PushActions.ACTION_SPEAKER))
        assertNull(ongoingCallActionOf(PushActions.ACTION_DECLINE))
        assertNull(ongoingCallActionOf(null))
    }

    @Test
    fun theCallStyleIsUsedOnlyWhenTelecomHoldsAnActiveCallOnAndroidTwelveOrLater() {
        assertEquals(OngoingCallStyle.Call, ongoingCallStyleOf(sdk = 36, telecomActive = true))
        assertEquals(OngoingCallStyle.Plain, ongoingCallStyleOf(sdk = 36, telecomActive = false))
        assertEquals(OngoingCallStyle.Plain, ongoingCallStyleOf(sdk = 30, telecomActive = true))
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
        assertEquals(PushChannels.ONGOING, ongoingCallChannel())
        assertEquals(false, PushChannels.ONGOING == PushChannels.CALLS)
    }

    @Test
    fun theOngoingCallCopyFollowsTheDeviceLanguage() {
        assertEquals(
            OngoingCallCopy("Llamada con Argus", "Colgar", "Silenciar", "Activar micrófono", "Altavoz", "Auricular"),
            ongoingCallCopy(spanish = true),
        )
        assertEquals(
            OngoingCallCopy("Call with Argus", "Hang up", "Mute", "Unmute", "Speaker", "Earpiece"),
            ongoingCallCopy(spanish = false),
        )
    }

    @Test
    fun anAssistantCallReopensTheAppAndAnIncomingCallReopensItsScreen() {
        assertEquals(null, ongoingDeepLink(OngoingCallState("assistant-1", outside = false, assistant = true, startedAtMillis = 0L)))
        assertEquals(
            "argus://call?callId=call-7&outside=1",
            ongoingDeepLink(OngoingCallState("call-7", outside = true, assistant = false, startedAtMillis = 0L)),
        )
    }
}
