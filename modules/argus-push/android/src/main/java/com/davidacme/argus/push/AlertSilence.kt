package com.davidacme.argus.push

internal enum class AlertVerdict { FullAlarm, Silent, SilentUntilRingOrAlarm }

internal object AlertSilence {
    const val RING_GRACE_MS = 8_000L

    fun decide(
        critical: Boolean,
        ringFollows: Boolean,
        activeRingEpisode: String?,
        alertEpisode: String?,
        exactAlarmsAllowed: Boolean,
    ): AlertVerdict {
        if (!critical || !exactAlarmsAllowed) return AlertVerdict.FullAlarm
        if (ringFollows) return AlertVerdict.SilentUntilRingOrAlarm
        if (alertEpisode != null && alertEpisode == activeRingEpisode) return AlertVerdict.Silent
        return AlertVerdict.FullAlarm
    }

    fun alarmDue(verdict: AlertVerdict, ringStarted: Boolean, elapsedMs: Long): Boolean =
        verdict == AlertVerdict.SilentUntilRingOrAlarm && !ringStarted && elapsedMs >= RING_GRACE_MS
}
