package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NativeTraceTest {
    @Test
    fun aTraceOutcomeIsOneLineWithItsReason() {
        assertEquals("trace restore outcome=error reason=read-error", NativeTrace.line("restore", "error", "read-error"))
        assertEquals("trace refresh outcome=refresh-rejected reason=refused", NativeTrace.line("refresh", "refresh-rejected", "refused"))
        assertEquals(
            "trace route outcome=redirect reason=signed-1-allowed-1-ready-0-waited-0-outside-1-locked-0",
            NativeTrace.line("route", "redirect", "signed-1-allowed-1-ready-0-waited-0-outside-1-locked-0"),
        )
        assertEquals("trace voice outcome=start reason=call", NativeTrace.line("voice", "start", "call"))
    }

    @Test
    fun anUnknownPhaseOutcomeOrReasonIsNeverLogged() {
        assertNull(NativeTrace.line("login", "ok", "session"))
        assertNull(NativeTrace.line("restore", "rotated", "session"))
        assertNull(NativeTrace.line("restore", "ok", "token=abc123"))
        assertNull(NativeTrace.line("restore", "ok", ""))
        assertNull(NativeTrace.line("voice", "start", "Bearer-abc"))
    }
}
