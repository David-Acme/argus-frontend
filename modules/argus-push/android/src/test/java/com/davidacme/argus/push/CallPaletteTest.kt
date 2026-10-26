package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class CallPaletteTest {
    @Test
    fun theCallStageIsAlwaysTheDarkStageOfTheApp() {
        assertEquals(0xFF181816.toInt(), CallPalette.STAGE.background)
        assertEquals(0xFF24231E.toInt(), CallPalette.STAGE.surface)
        assertEquals(0xFFF4EFE7.toInt(), CallPalette.STAGE.text)
    }

    @Test
    fun answerAndDeclineAreTheFlatCallColoursOfTheApp() {
        assertEquals(0xFF25A85A.toInt(), CallPalette.STAGE.accept)
        assertEquals(0xFFD83A34.toInt(), CallPalette.STAGE.decline)
        assertNotEquals(CallPalette.STAGE.accept, CallPalette.STAGE.decline)
    }
}
