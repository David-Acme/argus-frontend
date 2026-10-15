package com.davidacme.argus.push

internal enum class RingVibration { None, Repeating }

internal data class RingPlan(val sound: Boolean, val vibration: RingVibration)

internal object RingDecision {
    const val RINGER_SILENT = 0
    const val RINGER_VIBRATE = 1
    const val RINGER_NORMAL = 2

    fun plan(ringerMode: Int, vibrateWhileRinging: Boolean): RingPlan =
        when (ringerMode) {
            RINGER_NORMAL -> RingPlan(
                sound = true,
                vibration = if (vibrateWhileRinging) RingVibration.Repeating else RingVibration.None,
            )
            RINGER_VIBRATE -> RingPlan(sound = false, vibration = RingVibration.Repeating)
            else -> RingPlan(sound = false, vibration = RingVibration.None)
        }
}
