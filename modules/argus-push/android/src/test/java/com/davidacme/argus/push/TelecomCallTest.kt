package com.davidacme.argus.push

import android.telecom.CallAudioState
import android.telecom.CallEndpoint
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

    @Test
    fun theEndpointChoiceFollowsTheSpeakerToggleAndPrefersBluetoothThenWiredThenEarpiece() {
        val all = listOf(CallEndpoint.TYPE_EARPIECE, CallEndpoint.TYPE_SPEAKER, CallEndpoint.TYPE_BLUETOOTH)
        assertEquals(CallEndpoint.TYPE_SPEAKER, endpointFor(speaker = true, available = all))
        assertEquals(CallEndpoint.TYPE_BLUETOOTH, endpointFor(speaker = false, available = all))
        assertEquals(
            CallEndpoint.TYPE_WIRED_HEADSET,
            endpointFor(speaker = false, available = listOf(CallEndpoint.TYPE_WIRED_HEADSET, CallEndpoint.TYPE_EARPIECE)),
        )
        assertEquals(CallEndpoint.TYPE_EARPIECE, endpointFor(speaker = false, available = listOf(CallEndpoint.TYPE_EARPIECE)))
        assertEquals(null, endpointFor(speaker = true, available = listOf(CallEndpoint.TYPE_EARPIECE)))
    }
}
