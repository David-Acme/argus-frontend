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
}
