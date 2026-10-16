package com.davidacme.argus.push

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class KeyguardCallTest {
    @Test
    fun anOutsideAnswerShowsOverTheKeyguardUntilTheCallEnds() {
        assertTrue(KeyguardCall.showOverKeyguard(answeredFromOutside = true, ended = false))
        assertFalse(KeyguardCall.showOverKeyguard(answeredFromOutside = true, ended = true))
    }

    @Test
    fun anAnswerFromInsideTheAppNeverShowsOverTheKeyguard() {
        assertFalse(KeyguardCall.showOverKeyguard(answeredFromOutside = false, ended = false))
        assertFalse(KeyguardCall.showOverKeyguard(answeredFromOutside = false, ended = true))
    }
}
