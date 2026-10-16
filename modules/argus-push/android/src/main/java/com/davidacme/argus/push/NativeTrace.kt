package com.davidacme.argus.push

import android.util.Log

object NativeTrace {
    const val TAG = "ArgusTrace"

    private val phases = setOf("restore", "refresh", "route", "voice", "lock", "ongoing", "screen", "session", "decline")
    private val outcomes = setOf(
        "ok", "error", "partial", "absent", "refresh-rejected", "unavailable",
        "stay", "redirect", "start", "joined", "fallback", "sent", "stop", "shown", "cleared", "held", "released",
        "ended", "left", "failed", "queued",
    )
    private val reasonShape = Regex("[a-z0-9-]{1,96}")

    fun line(phase: String, outcome: String, reason: String): String? {
        if (phase !in phases || outcome !in outcomes || !reasonShape.matches(reason)) return null
        return "trace $phase outcome=$outcome reason=$reason"
    }

    fun record(phase: String, outcome: String, reason: String) {
        val line = line(phase, outcome, reason) ?: return
        Log.i(TAG, line)
    }
}
