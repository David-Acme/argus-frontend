package com.davidacme.argus.push

import android.util.Log

object SessionTrace {
    const val TAG = "ArgusSession"

    private val phases = setOf("restore", "refresh")
    private val outcomes = setOf("ok", "error", "partial", "absent", "refresh-rejected", "unavailable")
    private val reasonShape = Regex("[a-z-]{1,24}")

    fun line(phase: String, outcome: String, reason: String): String? {
        if (phase !in phases || outcome !in outcomes || !reasonShape.matches(reason)) return null
        return "session $phase outcome=$outcome reason=$reason"
    }

    fun record(phase: String, outcome: String, reason: String) {
        val line = line(phase, outcome, reason) ?: return
        Log.i(TAG, line)
    }
}
