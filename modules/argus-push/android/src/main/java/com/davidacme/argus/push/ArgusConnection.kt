package com.davidacme.argus.push

import android.content.Context
import android.os.Build
import android.os.OutcomeReceiver
import android.telecom.CallAudioState
import android.telecom.CallEndpoint
import android.telecom.CallEndpointException
import android.telecom.Connection
import android.telecom.DisconnectCause
import android.telecom.TelecomManager
import java.util.concurrent.Executor

internal class ArgusConnection(private val context: Context, val callId: String) : Connection() {
    @Volatile
    private var endpoints: List<CallEndpoint> = emptyList()

    init {
        setConnectionProperties(PROPERTY_SELF_MANAGED)
        setAudioModeIsVoip(true)
        setCallerDisplayName(CALLER_NAME, TelecomManager.PRESENTATION_ALLOWED)
    }

    override fun onAnswer() {
        CallSession.answer(context, callId)
    }

    override fun onAnswer(videoState: Int) {
        CallSession.answer(context, callId)
    }

    override fun onReject() {
        CallSession.decline(context, callId)
    }

    override fun onDisconnect() {
        CallSession.connectionEnded(context, this)
    }

    override fun onAbort() {
        CallSession.connectionEnded(context, this)
    }

    @Deprecated("Replaced by onMuteStateChanged and onCallEndpointChanged on API 34")
    override fun onCallAudioStateChanged(state: CallAudioState?) {
        if (state == null || Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return
        CallControls.mutedBySystem(context, state.isMuted)
        CallControls.routedBySystem(context, state.route == CallAudioState.ROUTE_SPEAKER)
    }

    override fun onMuteStateChanged(isMuted: Boolean) {
        CallControls.mutedBySystem(context, isMuted)
    }

    override fun onCallEndpointChanged(callEndpoint: CallEndpoint) {
        CallControls.routedBySystem(context, callEndpoint.endpointType == CallEndpoint.TYPE_SPEAKER)
    }

    override fun onAvailableCallEndpointsChanged(availableEndpoints: List<CallEndpoint>) {
        endpoints = availableEndpoints
    }

    fun route(speaker: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val target = endpointFor(speaker, endpoints.map { it.endpointType })
                ?.let { type -> endpoints.firstOrNull { it.endpointType == type } }
            if (target != null) {
                requestCallEndpointChange(target, DirectExecutor, EndpointResult)
                return
            }
        }
        @Suppress("DEPRECATION")
        val supported = callAudioState?.supportedRouteMask ?: CallAudioState.ROUTE_WIRED_OR_EARPIECE
        @Suppress("DEPRECATION")
        setAudioRoute(audioRouteOf(speaker, supported))
    }

    fun endWith(cause: Int) {
        setDisconnected(DisconnectCause(cause))
        destroy()
    }

    private object DirectExecutor : Executor {
        override fun execute(command: Runnable) {
            command.run()
        }
    }

    private object EndpointResult : OutcomeReceiver<Void, CallEndpointException> {
        override fun onResult(result: Void?) {
            NativeTrace.record("telecom", "route", "endpoint-changed")
        }

        override fun onError(error: CallEndpointException) {
            NativeTrace.record("telecom", "failed", "endpoint-change")
        }
    }

    private companion object {
        const val CALLER_NAME = "Argus"
    }
}

internal fun endpointFor(speaker: Boolean, available: List<Int>): Int? =
    when {
        speaker -> CallEndpoint.TYPE_SPEAKER.takeIf { it in available }
        CallEndpoint.TYPE_BLUETOOTH in available -> CallEndpoint.TYPE_BLUETOOTH
        CallEndpoint.TYPE_WIRED_HEADSET in available -> CallEndpoint.TYPE_WIRED_HEADSET
        CallEndpoint.TYPE_EARPIECE in available -> CallEndpoint.TYPE_EARPIECE
        else -> null
    }
