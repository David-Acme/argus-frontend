package com.davidacme.argus.push

internal data class RingInfo(
    val callId: String,
    val expiresAtSeconds: Long,
    val subject: String,
    val critical: Boolean,
    val episode: String = "",
)

internal data class RingDisplay(
    val subject: String,
    val critical: Boolean,
)

internal enum class RingChoice { Decline, Snooze, Answer }

internal fun ringChoices(critical: Boolean, snoozable: Boolean): List<RingChoice> =
    if (!critical && snoozable) {
        listOf(RingChoice.Decline, RingChoice.Snooze, RingChoice.Answer)
    } else {
        listOf(RingChoice.Decline, RingChoice.Answer)
    }
