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
    val startedAtMillis: Long,
)
