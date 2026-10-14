package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Test

class PushTextTest {
    @Test
    fun genericLineInSpanish() {
        assertEquals("Tienes un aviso nuevo. Abre Argus para verlo.", PushText.generic(spanish = true, urgent = false))
        assertEquals("Tienes un aviso importante. Abre Argus para verlo.", PushText.generic(spanish = true, urgent = true))
    }

    @Test
    fun genericLineInEnglish() {
        assertEquals("You have a new notice. Open Argus to see it.", PushText.generic(spanish = false, urgent = false))
        assertEquals("You have an important notice. Open Argus to see it.", PushText.generic(spanish = false, urgent = true))
    }

    @Test
    fun urgencyMapsToChannels() {
        assertEquals(PushChannels.CRITICAL, PushChannels.forUrgency("critical"))
        assertEquals(PushChannels.TIME_SENSITIVE, PushChannels.forUrgency("time_sensitive"))
        assertEquals(PushChannels.NORMAL, PushChannels.forUrgency("normal"))
        assertEquals(PushChannels.NORMAL, PushChannels.forUrgency(""))
    }
}
