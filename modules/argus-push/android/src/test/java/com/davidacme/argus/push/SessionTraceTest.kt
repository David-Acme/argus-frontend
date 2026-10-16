package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SessionTraceTest {
    @Test
    fun aRestoreOrRefreshOutcomeIsOneLineWithItsReason() {
        assertEquals("session restore outcome=error reason=read-error", SessionTrace.line("restore", "error", "read-error"))
        assertEquals("session refresh outcome=refresh-rejected reason=refused", SessionTrace.line("refresh", "refresh-rejected", "refused"))
    }

    @Test
    fun anUnknownPhaseOutcomeOrReasonIsNeverLogged() {
        assertNull(SessionTrace.line("login", "ok", "session"))
        assertNull(SessionTrace.line("restore", "rotated", "session"))
        assertNull(SessionTrace.line("restore", "ok", "token=abc123"))
        assertNull(SessionTrace.line("restore", "ok", ""))
    }
}
