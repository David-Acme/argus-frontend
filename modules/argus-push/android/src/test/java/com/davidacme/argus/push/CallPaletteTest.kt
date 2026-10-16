package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class CallPaletteTest {
    @Test
    fun aNightThemeUsesTheDarkTokensAndALightThemeUsesTheLightOnes() {
        assertEquals(0xFF181816.toInt(), CallPalette.of(night = true).background)
        assertEquals(0xFFF4F1ED.toInt(), CallPalette.of(night = false).background)
        assertNotEquals(CallPalette.of(night = true).text, CallPalette.of(night = false).text)
    }

    @Test
    fun acceptAndDeclineKeepTheirMeaningInBothThemes() {
        for (night in listOf(true, false)) {
            val palette = CallPalette.of(night)
            assertEquals(0xFF, (palette.accept ushr 24) and 0xFF)
            assertNotEquals(palette.accept, palette.decline)
        }
    }
}
