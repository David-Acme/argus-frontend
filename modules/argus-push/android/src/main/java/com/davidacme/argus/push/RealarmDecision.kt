package com.davidacme.argus.push

internal enum class RealarmAction { Skip, Realarm }

internal object RealarmDecision {
    fun decide(episode: String, ringStarted: Boolean): RealarmAction =
        if (episode.isEmpty() || ringStarted) RealarmAction.Skip else RealarmAction.Realarm

    fun triggerAtMillis(nowMillis: Long): Long = nowMillis + AlertSilence.RING_GRACE_MS
}
