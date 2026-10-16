package com.davidacme.argus.push

import android.telecom.CallAudioState
import org.junit.Assert.assertEquals
import org.junit.Test

class TelecomCallTest {
    @Test
    fun theIncomingConnectionUsesTheRequestedCallIdAndFallsBackToTheRingingCall() {
        assertEquals("call-7", incomingCallIdOf("call-7", "call-9"))
        assertEquals("call-9", incomingCallIdOf(null, "call-9"))
        assertEquals("call-9", incomingCallIdOf("", "call-9"))
        assertEquals("", incomingCallIdOf(null, null))
    }

    @Test
    fun theSpeakerToggleRoutesToTheSpeakerAndBackToBluetoothOrTheEarpiece() {
        assertEquals(CallAudioState.ROUTE_SPEAKER, audioRouteOf(speaker = true, supportedMask = CallAudioState.ROUTE_EARPIECE or CallAudioState.ROUTE_SPEAKER))
        assertEquals(
            CallAudioState.ROUTE_BLUETOOTH,
            audioRouteOf(speaker = false, supportedMask = CallAudioState.ROUTE_BLUETOOTH or CallAudioState.ROUTE_SPEAKER),
        )
        assertEquals(
            CallAudioState.ROUTE_WIRED_OR_EARPIECE,
            audioRouteOf(speaker = false, supportedMask = CallAudioState.ROUTE_EARPIECE or CallAudioState.ROUTE_SPEAKER),
        )
    }
}
