package com.davidacme.argus.push

import android.content.Context
import android.content.Intent

internal enum class OngoingCallAction { HangUp }

internal enum class OngoingCallRoute { ForegroundService }

internal fun ongoingCallActionOf(action: String?): OngoingCallAction? =
    if (action == PushActions.ACTION_HANG_UP) OngoingCallAction.HangUp else null

internal data class OngoingCallCopy(val title: String, val hangUp: String)

internal fun ongoingCallCopy(spanish: Boolean): OngoingCallCopy =
    if (spanish) OngoingCallCopy("Llamada en curso", "Colgar") else OngoingCallCopy("Call in progress", "Hang up")

internal fun ongoingCallRoute(): OngoingCallRoute = OngoingCallRoute.ForegroundService

internal fun shouldRunOngoingService(answered: Boolean, ended: Boolean): Boolean = answered && !ended

internal object OngoingCall {
    fun show(context: Context, callId: String, enteredFromOutside: Boolean) {
        if (enteredFromOutside) KeyguardCall.arm(callId)
        when (ongoingCallRoute()) {
            OngoingCallRoute.ForegroundService -> {
                try {
                    context.startForegroundService(OngoingCallService.intent(context, callId, enteredFromOutside))
                } catch (refused: IllegalStateException) {
                    NativeTrace.record("ongoing", "error", "service-refused")
                }
            }
        }
    }

    fun clear(context: Context) {
        context.stopService(Intent(context, OngoingCallService::class.java))
        NativeTrace.record("ongoing", "cleared", "call-ended")
    }
}
