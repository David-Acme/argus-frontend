package com.davidacme.argus.push

internal data class CallEnd(
    val stopRinger: Boolean,
    val finishScreen: Boolean,
    val cancelNotification: Boolean,
    val notificationId: Int,
)

internal object CallEndPlan {
    const val NOTIFICATION_ID = OngoingCall.ID

    fun forEnd(wasRinging: Boolean, answered: Boolean): CallEnd =
        CallEnd(
            stopRinger = wasRinging,
            finishScreen = true,
            cancelNotification = !answered,
            notificationId = NOTIFICATION_ID,
        )
}
