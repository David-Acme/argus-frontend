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
    fun anOngoingCallNotificationWithNoCallBehindItIsStale() {
        assertEquals(true, ongoingIsStale(showing = true, inCall = false))
        assertEquals(false, ongoingIsStale(showing = true, inCall = true))
        assertEquals(false, ongoingIsStale(showing = false, inCall = false))
    }

    @Test
    fun theOngoingCallPostsOnTheChannelThatTheChannelSetupCreates() {
        assertEquals(PushChannels.ONGOING, ongoingCallChannel())
        assertEquals(false, PushChannels.ONGOING == PushChannels.CALLS)
    }

    @Test
    fun theOngoingCallCopyFollowsTheDeviceLanguage() {
        assertEquals(
            OngoingCallCopy("Llamada con Argus", "Toca para volver", "Colgar", "Silenciar", "Activar micrófono", "Altavoz", "Auricular"),
            ongoingCallCopy(spanish = true),
        )
        assertEquals(
            OngoingCallCopy("Call with Argus", "Tap to return", "Hang up", "Mute", "Unmute", "Speaker", "Earpiece"),
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

    @Test
    fun theMicrophoneTypeIsClaimedOnlyOnceThePermissionIsGranted() {
        val phoneCall = android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL
        assertEquals(phoneCall, ongoingServiceTypes(microphoneGranted = false))
        assertEquals(phoneCall or MICROPHONE_TYPE, ongoingServiceTypes(microphoneGranted = true))
    }

    @Test
    fun aServiceIsPromotedAgainWhenItLostItsForegroundOrStillLacksTheMicrophone() {
        val phoneCall = android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL
        assertEquals(true, needsPromotion(currentTypes = 0, microphoneGranted = false))
        assertEquals(true, needsPromotion(currentTypes = phoneCall, microphoneGranted = true))
        assertEquals(false, needsPromotion(currentTypes = phoneCall, microphoneGranted = false))
        assertEquals(false, needsPromotion(currentTypes = phoneCall or MICROPHONE_TYPE, microphoneGranted = true))
    }

    @Test
    fun theCallStyleNotificationCarriesSilenciarAndAltavozWithTheirOwnIconsAndLeavesColgarToTheSystem() {
        val actions = ongoingCallActions(ongoingCallCopy(spanish = true), CallControlState(speakerOn = false, muted = false), OngoingCallStyle.Call)
        assertEquals(
            listOf(
                OngoingActionSpec(OngoingCallAction.Mute, "Silenciar", OngoingCallIcon.MicOff),
                OngoingActionSpec(OngoingCallAction.Speaker, "Altavoz", OngoingCallIcon.Speaker),
            ),
            actions,
        )
    }

    @Test
    fun thePlainNotificationEndsWithColgarSoThePrototypeOrderHolds() {
        val actions = ongoingCallActions(ongoingCallCopy(spanish = true), CallControlState(speakerOn = false, muted = false), OngoingCallStyle.Plain)
        assertEquals(listOf("Silenciar", "Altavoz", "Colgar"), actions.map { it.label })
        assertEquals(OngoingCallIcon.HangUp, actions.last().icon)
    }

    @Test
    fun theLabelsAndIconsFollowTheCurrentMuteAndRoute() {
        val actions = ongoingCallActions(ongoingCallCopy(spanish = false), CallControlState(speakerOn = true, muted = true), OngoingCallStyle.Call)
        assertEquals(
            listOf(
                OngoingActionSpec(OngoingCallAction.Mute, "Unmute", OngoingCallIcon.Mic),
                OngoingActionSpec(OngoingCallAction.Speaker, "Earpiece", OngoingCallIcon.Earpiece),
            ),
            actions,
        )
    }

    @Test
    fun noActionUsesTheLauncherIconSoNoPillIsPaintedBlankAndTheTraceSaysSo() {
        val actions = ongoingCallActions(ongoingCallCopy(spanish = true), CallControlState(speakerOn = false, muted = false), OngoingCallStyle.Plain)
        assertEquals(actions.size, actions.map { it.icon }.toSet().size)
        val reason = ongoingActionsTrace(actions, OngoingCallStyle.Call)
        assertEquals("actions-3-own-icons-call-style-default-color", reason)
        assertEquals("trace ongoing outcome=shown reason=$reason", NativeTrace.line("ongoing", "shown", reason))
    }
}
