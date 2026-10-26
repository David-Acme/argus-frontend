package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Test

class PushVisibilityTest {
    @Test
    fun aMissedCallShowsTheSameNoDetailCopyPrivateAndLocked() {
        val copy = PushVisibility.alertCopy(
            type = PushVisibility.MISSED_CALL_TYPE,
            title = "Llamada perdida · Persona desconocida en Patio",
            body = "Te llamé porque hay alguien en el patio.",
            spanish = true,
            urgent = true,
        )
        assertEquals("Llamada perdida", copy.title)
        assertEquals("Toca para ver quién llamó", copy.body)
        assertEquals("Llamada perdida", copy.publicTitle)
        assertEquals("Toca para ver quién llamó", copy.publicBody)
        assertEquals(true, copy.callBack)
    }

    @Test
    fun aMissedCallInEnglishUsesTheEnglishNoDetailCopy() {
        val copy = PushVisibility.alertCopy(
            type = PushVisibility.MISSED_CALL_TYPE,
            title = "Missed call · Front door",
            body = "I called because someone is at the door.",
            spanish = false,
            urgent = false,
        )
        assertEquals("Missed call", copy.title)
        assertEquals("Tap to see who called", copy.body)
        assertEquals("Missed call", copy.publicTitle)
        assertEquals("Tap to see who called", copy.publicBody)
    }

    @Test
    fun anAlertWithAPlaceOrPersonLocksToTheGenericAppTitle() {
        val copy = PushVisibility.alertCopy(
            type = "camera",
            title = "Patio: persona desconocida",
            body = "Detectamos una persona en el patio.",
            spanish = true,
            urgent = true,
        )
        assertEquals("Patio: persona desconocida", copy.title)
        assertEquals(PushText.TITLE, copy.publicTitle)
        assertEquals(PushText.generic(spanish = true, urgent = true), copy.publicBody)
        assertEquals(false, copy.callBack)
    }

    @Test
    fun anAlertWithoutATitleFallsBackToTheAppTitle() {
        val copy = PushVisibility.alertCopy(type = "", title = "", body = "Aviso", spanish = false, urgent = false)
        assertEquals(PushText.TITLE, copy.title)
        assertEquals(PushText.TITLE, copy.publicTitle)
    }
}
