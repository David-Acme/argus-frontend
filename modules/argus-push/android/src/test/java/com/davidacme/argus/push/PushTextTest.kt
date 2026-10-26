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
    fun theStageLineNamesTheKindAndTheSubject() {
        assertEquals("Llamada de Argus · Pagar la luz", PushText.stageLine(spanish = true, critical = false, subject = " Pagar la luz "))
        assertEquals("Alerta en casa · Alguien en el patio", PushText.stageLine(spanish = true, critical = true, subject = "Alguien en el patio"))
        assertEquals("Argus call", PushText.stageLine(spanish = false, critical = false, subject = ""))
        assertEquals("Alerta en casa", PushText.criticalTitle(spanish = true))
        assertEquals("Privada · se queda en tu casa", PushText.privateLine(spanish = true))
    }

    @Test
    fun theCallButtonsReadLikeAPhoneCall() {
        assertEquals("Rechazar", PushText.decline(spanish = true))
        assertEquals("En 10 min", PushText.snooze(spanish = true))
        assertEquals("Contestar", PushText.answer(spanish = true))
        assertEquals("Devolver", PushText.callBack(spanish = true))
        assertEquals("Call back", PushText.callBack(spanish = false))
    }
}
