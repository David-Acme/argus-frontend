package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Test

class BackgroundAccessTest {
    @Test
    fun theOneTapExemptionComesFirstAndTheAppPageOnlyForALeftoverRestriction() {
        assertEquals(BackgroundStep.AskExemption, backgroundStepOf(exempt = false, restricted = false))
        assertEquals(BackgroundStep.AskExemption, backgroundStepOf(exempt = false, restricted = true))
        assertEquals(BackgroundStep.OpenAppSettings, backgroundStepOf(exempt = true, restricted = true))
        assertEquals(BackgroundStep.Granted, backgroundStepOf(exempt = true, restricted = false))
    }
}
