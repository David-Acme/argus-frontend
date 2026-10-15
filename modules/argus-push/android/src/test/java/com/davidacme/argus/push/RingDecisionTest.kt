package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Test

class RingDecisionTest {
    @Test
    fun normalRingsAndVibratesOnlyWhenTheSystemAsksForIt() {
        assertEquals(
            RingPlan(sound = true, vibration = RingVibration.Repeating),
            RingDecision.plan(RingDecision.RINGER_NORMAL, vibrateWhileRinging = true),
        )
        assertEquals(
            RingPlan(sound = true, vibration = RingVibration.None),
            RingDecision.plan(RingDecision.RINGER_NORMAL, vibrateWhileRinging = false),
        )
    }

    @Test
    fun vibrateModeVibratesWithoutSound() {
        assertEquals(
            RingPlan(sound = false, vibration = RingVibration.Repeating),
            RingDecision.plan(RingDecision.RINGER_VIBRATE, vibrateWhileRinging = false),
        )
        assertEquals(
            RingPlan(sound = false, vibration = RingVibration.Repeating),
            RingDecision.plan(RingDecision.RINGER_VIBRATE, vibrateWhileRinging = true),
        )
    }

    @Test
    fun silentModeNeitherRingsNorVibrates() {
        assertEquals(
            RingPlan(sound = false, vibration = RingVibration.None),
            RingDecision.plan(RingDecision.RINGER_SILENT, vibrateWhileRinging = true),
        )
    }
}
