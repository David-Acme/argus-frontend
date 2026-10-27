package com.davidacme.argus.push

import android.app.NotificationManager
import android.content.Context
import android.content.Intent

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
    val back: String,
    val hangUp: String,
    val mute: String,
    val unmute: String,
    val speaker: String,
    val earpiece: String,
)

internal fun ongoingCallCopy(spanish: Boolean): OngoingCallCopy =
    if (spanish) {
        OngoingCallCopy("Llamada con Argus", "Toca para volver", "Colgar", "Silenciar", "Activar micrófono", "Altavoz", "Auricular")
    } else {
        OngoingCallCopy("Call with Argus", "Tap to return", "Hang up", "Mute", "Unmute", "Speaker", "Earpiece")
    }

internal enum class OngoingCallIcon { Mic, MicOff, Speaker, Earpiece, HangUp }

internal data class OngoingActionSpec(val action: OngoingCallAction, val label: String, val icon: OngoingCallIcon)

internal fun ongoingCallActions(copy: OngoingCallCopy, controls: CallControlState, style: OngoingCallStyle): List<OngoingActionSpec> {
    val mute = if (controls.muted) {
        OngoingActionSpec(OngoingCallAction.Mute, copy.unmute, OngoingCallIcon.Mic)
    } else {
        OngoingActionSpec(OngoingCallAction.Mute, copy.mute, OngoingCallIcon.MicOff)
    }
    val speaker = if (controls.speakerOn) {
        OngoingActionSpec(OngoingCallAction.Speaker, copy.earpiece, OngoingCallIcon.Earpiece)
    } else {
        OngoingActionSpec(OngoingCallAction.Speaker, copy.speaker, OngoingCallIcon.Speaker)
    }
    return when (style) {
        OngoingCallStyle.Call -> listOf(mute, speaker)
        OngoingCallStyle.Plain -> listOf(mute, speaker, OngoingActionSpec(OngoingCallAction.HangUp, copy.hangUp, OngoingCallIcon.HangUp))
    }
}

internal fun ongoingActionTint(action: OngoingCallAction, style: OngoingCallStyle, palette: CallPalette = CallPalette.STAGE): Int? =
    when {
        action == OngoingCallAction.HangUp -> palette.decline
        style == OngoingCallStyle.Call -> palette.control
        else -> null
    }

internal fun ongoingActionsTrace(actions: List<OngoingActionSpec>, style: OngoingCallStyle): String {
    val tinted = actions.count { ongoingActionTint(it.action, style) != null }
    return "actions-${actions.size}-own-icons-${style.name.lowercase()}-style-tinted-$tinted"
}

internal fun ongoingCallRoute(): OngoingCallRoute = OngoingCallRoute.ForegroundService

internal fun ongoingCallChannel(): String = PushChannels.ONGOING

internal fun ongoingDeepLink(state: OngoingCallState): String? =
    if (state.assistant) null else callDeepLink(state.callId, state.outside)

internal fun shouldRunOngoingService(answered: Boolean, ended: Boolean): Boolean = answered && !ended

internal fun ongoingIsStale(showing: Boolean, inCall: Boolean): Boolean = showing && !inCall

internal object CallFinish {
    fun finish(context: Context, callId: String?) {
        OngoingCall.clear(context)
        KeyguardCall.endCall(callId)
    }
}

internal object OngoingCall {
    const val TAG = "argus-ongoing-call"
    const val ID = 7046

    fun show(context: Context, callId: String, enteredFromOutside: Boolean, assistant: Boolean = false) {
        if (enteredFromOutside) KeyguardCall.arm(callId)
        PushChannels.ensure(context)
        PushNotifier.cancelMissedCalls(context)
        when (ongoingCallRoute()) {
            OngoingCallRoute.ForegroundService -> {
                try {
                    context.startForegroundService(OngoingCallService.intent(context, callId, enteredFromOutside, assistant))
                } catch (refused: IllegalStateException) {
                    NativeTrace.record("ongoing", "error", "service-refused")
                }
            }
        }
    }

    fun repromote(context: Context) {
        if (ongoingIsStale(OngoingCallService.showing(), CallSession.inCall())) {
            clear(context)
            return
        }
        val state = OngoingCallService.demoted(context) ?: return
        try {
            context.startForegroundService(OngoingCallService.intent(context, state.callId, state.outside, state.assistant))
        } catch (refused: IllegalStateException) {
            NativeTrace.record("ongoing", "error", "repromote-refused")
        }
    }

    fun clear(context: Context) {
        context.getSystemService(NotificationManager::class.java)?.let { manager ->
            manager.cancel(TAG, ID)
            manager.cancel(ID)
        }
        context.stopService(Intent(context, OngoingCallService::class.java))
        CallControls.reset()
        NativeTrace.record("ongoing", "cleared", "call-ended")
    }
}

internal data class CallControlState(val speakerOn: Boolean, val muted: Boolean)

internal object CallControls {
    private val lock = Any()
    private var state = CallControlState(speakerOn = false, muted = false)

    @Volatile
    var listener: ((String) -> Unit)? = null

    fun snapshot(): CallControlState = synchronized(lock) { state }

    fun toggleSpeaker(context: Context) {
        val next = synchronized(lock) { state.copy(speakerOn = !state.speakerOn).also { state = it } }
        CallSession.routeAudio(next.speakerOn)
        NativeTrace.record("telecom", "route", if (next.speakerOn) "speaker" else "earpiece")
        OngoingCallService.refresh(context)
    }

    fun toggleMute(context: Context) {
        val next = synchronized(lock) { state.copy(muted = !state.muted).also { state = it } }
        NativeTrace.record("telecom", "mute", if (next.muted) "on" else "off")
        emit(if (next.muted) "mute-on" else "mute-off")
        OngoingCallService.refresh(context)
    }

    fun mutedByApp(context: Context, muted: Boolean) {
        val changed = synchronized(lock) {
            (state.muted != muted).also { if (it) state = state.copy(muted = muted) }
        }
        if (changed) OngoingCallService.refresh(context)
    }

    fun mutedBySystem(context: Context, muted: Boolean) {
        val changed = synchronized(lock) {
            (state.muted != muted).also { if (it) state = state.copy(muted = muted) }
        }
        if (!changed) return
        NativeTrace.record("telecom", "mute", if (muted) "system-on" else "system-off")
        emit(if (muted) "mute-on" else "mute-off")
        OngoingCallService.refresh(context)
    }

    fun routedBySystem(context: Context, speakerOn: Boolean) {
        val changed = synchronized(lock) {
            (state.speakerOn != speakerOn).also { if (it) state = state.copy(speakerOn = speakerOn) }
        }
        if (changed) OngoingCallService.refresh(context)
    }

    fun endpointsChanged() {
        emit("endpoints")
    }

    fun hangUp() {
        NativeTrace.record("telecom", "disconnected", "hangup-requested")
        emit("hangup")
    }

    fun reset() {
        synchronized(lock) { state = CallControlState(speakerOn = false, muted = false) }
    }

    private fun emit(action: String) {
        runCatching { listener?.invoke(action) }.onFailure {
            PushLog.warn("the call control listener failed for $action")
        }
    }
}
