package com.davidacme.argus.push

internal data class CallEnd(
    val stopRinger: Boolean,
    val finishScreen: Boolean,
    val notificationTag: String,
    val notificationId: Int,
)

internal object CallEndPlan {
    const val NOTIFICATION_ID = 2

    fun tagFor(callId: String): String = "call-$callId"

    fun forEnd(wasRinging: Boolean, callId: String): CallEnd =
        CallEnd(
            stopRinger = wasRinging,
            finishScreen = true,
            notificationTag = tagFor(callId),
            notificationId = NOTIFICATION_ID,
        )
}
