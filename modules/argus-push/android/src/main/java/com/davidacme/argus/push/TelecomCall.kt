package com.davidacme.argus.push

import android.content.Context
import android.net.Uri
import android.os.Build
import android.telecom.DisconnectCause
import androidx.core.telecom.CallAttributesCompat
import androidx.core.telecom.CallControlResult
import androidx.core.telecom.CallControlScope
import androidx.core.telecom.CallEndpointCompat
import androidx.core.telecom.CallException
import androidx.core.telecom.CallsManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

internal enum class TelecomCallState { Idle, Ringing, Active }

internal object TelecomCall {
    private const val CALLER_NAME = "Argus"

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val lock = Any()
    private var manager: CallsManager? = null
    private var control: CallControlScope? = null
    private var callId: String? = null
    private var job: Job? = null
    private var endpoints: List<CallEndpointCompat> = emptyList()
    private var state = TelecomCallState.Idle

    fun state(): TelecomCallState = synchronized(lock) { state }

    fun isActive(): Boolean = state() == TelecomCallState.Active

    fun addIncoming(context: Context, id: String) {
        val calls = managerOf(context) ?: return
        val app = context.applicationContext
        end(DisconnectCause.OTHER)
        synchronized(lock) {
            callId = id
            state = TelecomCallState.Ringing
        }
        val started = scope.launch {
            try {
                calls.addCall(
                    CallAttributesCompat(
                        displayName = CALLER_NAME,
                        address = Uri.fromParts("argus", id, null),
                        direction = CallAttributesCompat.DIRECTION_INCOMING,
                        callType = CallAttributesCompat.CALL_TYPE_AUDIO_CALL,
                        callCapabilities = CallAttributesCompat.SUPPORTS_SET_INACTIVE,
                    ),
                    onAnswer = { CallSession.answer(app, id) },
                    onDisconnect = { cause -> onSystemDisconnect(app, id, cause) },
                    onSetActive = {},
                    onSetInactive = {},
                ) {
                    synchronized(lock) { if (callId == id) control = this }
                    NativeTrace.record("telecom", "attached", "incoming")
                    launch { availableEndpoints.collect { list -> synchronized(lock) { endpoints = list } } }
                    launch {
                        currentCallEndpoint.collect { endpoint ->
                            CallControls.routedBySystem(app, endpoint.type == CallEndpointCompat.TYPE_SPEAKER)
                        }
                    }
                    launch { isMuted.collect { muted -> CallControls.mutedBySystem(app, muted) } }
                }
            } catch (refused: CallException) {
                NativeTrace.record("telecom", "failed", "add-call")
            } catch (unsupported: UnsupportedOperationException) {
                NativeTrace.record("telecom", "failed", "unsupported")
            } catch (denied: SecurityException) {
                NativeTrace.record("telecom", "failed", "security")
            } finally {
                synchronized(lock) {
                    if (callId == id) {
                        control = null
                        callId = null
                        endpoints = emptyList()
                        state = TelecomCallState.Idle
                    }
                }
            }
        }
        synchronized(lock) { job = started }
    }

    fun answer(id: String, then: () -> Unit) {
        val current = synchronized(lock) { control?.takeIf { callId == id } }
        if (current == null) {
            NativeTrace.record("telecom", "absent", "answer")
            then()
            return
        }
        scope.launch {
            val result = runCatching { current.answer(CallAttributesCompat.CALL_TYPE_AUDIO_CALL) }.getOrNull()
            val answered = result is CallControlResult.Success
            if (answered) synchronized(lock) { if (callId == id) state = TelecomCallState.Active }
            NativeTrace.record("telecom", if (answered) "active" else "failed", "answer")
            then()
        }
    }

    fun end(cause: Int) {
        val current = synchronized(lock) {
            val held = control
            control = null
            callId = null
            endpoints = emptyList()
            state = TelecomCallState.Idle
            held
        }
        val previous = synchronized(lock) { job.also { job = null } }
        if (current == null) {
            previous?.cancel()
            return
        }
        scope.launch {
            runCatching { current.disconnect(DisconnectCause(cause)) }
            NativeTrace.record("telecom", "disconnected", disconnectReasonOf(cause))
            previous?.cancel()
        }
    }

    fun route(speaker: Boolean) {
        val (current, available) = synchronized(lock) { Pair(control, endpoints) }
        if (current == null) return
        val type = endpointFor(speaker, available.map { it.type }) ?: return
        val target = available.firstOrNull { it.type == type } ?: return
        scope.launch {
            val result = runCatching { current.requestEndpointChange(target) }.getOrNull()
            NativeTrace.record("telecom", if (result is CallControlResult.Success) "route" else "failed", "endpoint")
        }
    }

    private fun onSystemDisconnect(context: Context, id: String, cause: DisconnectCause) {
        val (ours, held) = synchronized(lock) {
            val matched = callId == id
            if (matched) {
                control = null
                callId = null
                endpoints = emptyList()
                state = TelecomCallState.Idle
            }
            Pair(matched, if (matched) job.also { job = null } else null)
        }
        scope.launch { held?.cancel() }
        NativeTrace.record("telecom", "disconnected", "system-${disconnectReasonOf(cause.code)}")
        if (ours) CallSession.systemEnded(context, id)
    }

    private fun managerOf(context: Context): CallsManager? {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return null
        synchronized(lock) { manager?.let { return it } }
        return try {
            CallsManager(context.applicationContext).also { calls ->
                calls.registerAppWithTelecom(CallsManager.CAPABILITY_BASELINE)
                synchronized(lock) { manager = calls }
            }
        } catch (denied: SecurityException) {
            NativeTrace.record("telecom", "failed", "register")
            null
        } catch (unsupported: UnsupportedOperationException) {
            NativeTrace.record("telecom", "failed", "unsupported")
            null
        }
    }
}

internal fun disconnectReasonOf(cause: Int): String =
    when (cause) {
        DisconnectCause.LOCAL -> "local"
        DisconnectCause.REMOTE -> "remote"
        DisconnectCause.REJECTED -> "rejected"
        DisconnectCause.MISSED -> "missed"
        DisconnectCause.CANCELED -> "canceled"
        DisconnectCause.BUSY -> "busy"
        DisconnectCause.ERROR -> "error"
        else -> "other"
    }

internal fun endpointFor(speaker: Boolean, available: List<Int>): Int? =
    when {
        speaker -> CallEndpointCompat.TYPE_SPEAKER.takeIf { it in available }
        CallEndpointCompat.TYPE_BLUETOOTH in available -> CallEndpointCompat.TYPE_BLUETOOTH
        CallEndpointCompat.TYPE_WIRED_HEADSET in available -> CallEndpointCompat.TYPE_WIRED_HEADSET
        CallEndpointCompat.TYPE_EARPIECE in available -> CallEndpointCompat.TYPE_EARPIECE
        else -> null
    }
