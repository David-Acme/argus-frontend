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
    fun theOngoingCallCopyFollowsTheDeviceLanguage() {
        assertEquals(OngoingCallCopy("Llamada en curso", "Colgar"), ongoingCallCopy(spanish = true))
        assertEquals(OngoingCallCopy("Call in progress", "Hang up"), ongoingCallCopy(spanish = false))
    }
}
