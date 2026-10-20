package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Test

class PushTextTest {
    @Test
    fun theRingScreenNamesTheSubjectOrArgus() {
        assertEquals("Prueba R3 contestar", PushText.ringTitle("  Prueba R3 contestar "))
        assertEquals("Argus", PushText.ringTitle(""))
        assertEquals("Argus", PushText.ringTitle("   "))
    }

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
    fun missedCallPromptInBothLanguages() {
        assertEquals("Toca para ver quién llamó", PushText.missedCallBody(spanish = true))
        assertEquals("Tap to see who called", PushText.missedCallBody(spanish = false))
    }

    @Test
    fun urgencyMapsToChannels() {
        assertEquals(PushChannels.CRITICAL, PushChannels.forUrgency("critical"))
        assertEquals(PushChannels.TIME_SENSITIVE, PushChannels.forUrgency("time_sensitive"))
        assertEquals(PushChannels.NORMAL, PushChannels.forUrgency("normal"))
        assertEquals(PushChannels.NORMAL, PushChannels.forUrgency(""))
    }

    @Test
    fun ringStatusAndClockForBothLanguages() {
        assertEquals("Llamada de Argus · sonando · 00:04", PushText.ringStatus(spanish = true, time = PushText.clock(4_200L)))
        assertEquals("Argus call · ringing · 01:05", PushText.ringStatus(spanish = false, time = PushText.clock(65_000L)))
        assertEquals("00:00", PushText.clock(-10L))
        assertEquals("Alerta crítica", PushText.criticalTitle(spanish = true))
    }
}
