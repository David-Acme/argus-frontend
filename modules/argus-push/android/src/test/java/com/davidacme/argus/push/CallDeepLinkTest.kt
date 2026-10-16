package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Test

class CallDeepLinkTest {
    @Test
    fun aCallOpenedFromInsideTheAppHasNoOutsideFlag() {
        assertEquals("argus://call?callId=call-0007", callDeepLink("call-0007", enteredFromOutside = false))
    }

    @Test
    fun aCallAnsweredFromOutsideTheAppCarriesTheOutsideFlag() {
        assertEquals("argus://call?callId=call-0007&outside=1", callDeepLink("call-0007", enteredFromOutside = true))
    }
}
