package com.davidacme.argus.push

import android.telecom.DisconnectCause
import androidx.core.telecom.CallEndpointCompat
import org.junit.Assert.assertEquals
import org.junit.Test

class TelecomCallTest {
    @Test
    fun theEndpointChoiceFollowsTheSpeakerToggleAndPrefersBluetoothThenWiredThenEarpiece() {
        val all = listOf(CallEndpointCompat.TYPE_EARPIECE, CallEndpointCompat.TYPE_SPEAKER, CallEndpointCompat.TYPE_BLUETOOTH)
        assertEquals(CallEndpointCompat.TYPE_SPEAKER, endpointFor(speaker = true, available = all))
        assertEquals(CallEndpointCompat.TYPE_BLUETOOTH, endpointFor(speaker = false, available = all))
        assertEquals(
            CallEndpointCompat.TYPE_WIRED_HEADSET,
            endpointFor(
                speaker = false,
                available = listOf(CallEndpointCompat.TYPE_WIRED_HEADSET, CallEndpointCompat.TYPE_EARPIECE),
            ),
        )
        assertEquals(
            CallEndpointCompat.TYPE_EARPIECE,
            endpointFor(speaker = false, available = listOf(CallEndpointCompat.TYPE_EARPIECE)),
        )
        assertEquals(null, endpointFor(speaker = true, available = listOf(CallEndpointCompat.TYPE_EARPIECE)))
    }

    @Test
    fun everyDisconnectCauseHasATraceableReason() {
        assertEquals("local", disconnectReasonOf(DisconnectCause.LOCAL))
        assertEquals("remote", disconnectReasonOf(DisconnectCause.REMOTE))
        assertEquals("rejected", disconnectReasonOf(DisconnectCause.REJECTED))
        assertEquals("missed", disconnectReasonOf(DisconnectCause.MISSED))
        assertEquals("other", disconnectReasonOf(DisconnectCause.OTHER))
    }

    @Test
    fun theSpeakerIsTheDefaultOnlyWithoutAHeadset() {
        val phone = listOf(CallEndpointCompat.TYPE_EARPIECE, CallEndpointCompat.TYPE_SPEAKER)
        assertEquals(true, speakerByDefault(phone))
        assertEquals(false, speakerByDefault(phone + CallEndpointCompat.TYPE_BLUETOOTH))
        assertEquals(false, speakerByDefault(phone + CallEndpointCompat.TYPE_WIRED_HEADSET))
        assertEquals(false, speakerByDefault(listOf(CallEndpointCompat.TYPE_EARPIECE)))
    }

    @Test
    fun everyEndpointTypeHasAKindTheAppReads() {
        assertEquals("earpiece", endpointKindOf(CallEndpointCompat.TYPE_EARPIECE))
        assertEquals("speaker", endpointKindOf(CallEndpointCompat.TYPE_SPEAKER))
        assertEquals("bluetooth", endpointKindOf(CallEndpointCompat.TYPE_BLUETOOTH))
        assertEquals("wired", endpointKindOf(CallEndpointCompat.TYPE_WIRED_HEADSET))
        assertEquals("streaming", endpointKindOf(CallEndpointCompat.TYPE_STREAMING))
        assertEquals("unknown", endpointKindOf(CallEndpointCompat.TYPE_UNKNOWN))
    }
}
