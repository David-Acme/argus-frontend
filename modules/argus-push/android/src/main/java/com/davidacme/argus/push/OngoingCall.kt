package com.davidacme.argus.push

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager

internal enum class OngoingCallAction { HangUp, Speaker, Mute }

internal enum class OngoingCallStyle { Call, Plain }

internal fun ongoingCallStyleOf(sdk: Int, telecomActive: Boolean): OngoingCallStyle =
    if (sdk >= 31 && telecomActive) OngoingCallStyle.Call else OngoingCallStyle.Plain

internal enum class OngoingCallRoute { ForegroundService }

internal fun ongoingCallActionOf(action: String?): OngoingCallAction? =
    when (action) {
        PushActions.ACTION_HANG_UP -> OngoingCallAction.HangUp
        PushActions.ACTION_SPEAKER -> OngoingCallAction.Speaker
        PushActions.ACTION_MUTE -> OngoingCallAction.Mute
        else -> null
    }

internal data class OngoingCallCopy(
    val title: String,
    val hangUp: String,
    val mute: String,
    val unmute: String,
    val speaker: String,
    val earpiece: String,
)

internal fun ongoingCallCopy(spanish: Boolean): OngoingCallCopy =
    if (spanish) {
        OngoingCallCopy("Llamada con Argus", "Colgar", "Silenciar", "Activar micrófono", "Altavoz", "Auricular")
    } else {
        OngoingCallCopy("Call with Argus", "Hang up", "Mute", "Unmute", "Speaker", "Earpiece")
    }

internal fun ongoingCallRoute(): OngoingCallRoute = OngoingCallRoute.ForegroundService

internal fun ongoingCallChannel(): String = PushChannels.ONGOING

internal fun shouldRunOngoingService(answered: Boolean, ended: Boolean): Boolean = answered && !ended

internal object CallFinish {
    fun finish(context: Context, callId: String?) {
        OngoingCall.clear(context)
        KeyguardCall.endCall(callId)
    }
}

internal object OngoingCall {
    const val TAG = "argus-ongoing-call"
    const val ID = 7046

    fun show(context: Context, callId: String, enteredFromOutside: Boolean) {
        if (enteredFromOutside) KeyguardCall.arm(callId)
        PushChannels.ensure(context)
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
        context.getSystemService(NotificationManager::class.java)?.let { manager ->
            manager.cancel(TAG, ID)
            manager.cancel(ID)
        }
        context.stopService(Intent(context, OngoingCallService::class.java))
        CallControls.reset(context)
        NativeTrace.record("ongoing", "cleared", "call-ended")
    }
}

internal data class CallControlState(val speakerOn: Boolean, val muted: Boolean)

internal object CallControls {
    private val lock = Any()
    private var state = CallControlState(speakerOn = false, muted = false)

    fun snapshot(): CallControlState = synchronized(lock) { state }

    fun toggleSpeaker(context: Context) {
        val next = synchronized(lock) { state.copy(speakerOn = !state.speakerOn).also { state = it } }
        CallSession.routeAudio(next.speakerOn)
        NativeTrace.record("telecom", "route", if (next.speakerOn) "speaker" else "earpiece")
        OngoingCallService.refresh(context)
    }

    fun toggleMute(context: Context) {
        val next = synchronized(lock) { state.copy(muted = !state.muted).also { state = it } }
        context.getSystemService(AudioManager::class.java)?.isMicrophoneMute = next.muted
        NativeTrace.record("telecom", "mute", if (next.muted) "on" else "off")
        OngoingCallService.refresh(context)
    }

    fun reset(context: Context) {
        val wasMuted = synchronized(lock) { state.muted.also { state = CallControlState(speakerOn = false, muted = false) } }
        if (wasMuted) context.getSystemService(AudioManager::class.java)?.isMicrophoneMute = false
    }
}
