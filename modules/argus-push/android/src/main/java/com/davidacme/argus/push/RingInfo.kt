package com.davidacme.argus.push

internal data class RingInfo(
    val callId: String,
    val expiresAtSeconds: Long,
    val reason: String,
    val critical: Boolean,
)

internal data class RingDisplay(
    val reason: String,
    val critical: Boolean,
    val startedAtMillis: Long,
)
