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
    private var routed: CallEndpointCompat? = null
    private var state = TelecomCallState.Idle
    private var defaultRoutePending = false

    fun state(): TelecomCallState = synchronized(lock) { state }

    fun isActive(): Boolean = state() == TelecomCallState.Active

    fun addIncoming(context: Context, id: String) {
        val app = context.applicationContext
        add(app, id, CallAttributesCompat.DIRECTION_INCOMING, onAnswer = { CallSession.answer(app, id) }) {}
    }

    fun addOutgoing(context: Context, id: String, ready: (Boolean) -> Unit) {
        val app = context.applicationContext
        val added = add(app, id, CallAttributesCompat.DIRECTION_OUTGOING, onAnswer = {}, failed = { ready(false) }) {
            launch {
                val result = runCatching { setActive() }.getOrNull()
                val active = result is CallControlResult.Success
                if (active) markActive(id)
                NativeTrace.record("telecom", if (active) "active" else "failed", "outgoing")
                ready(active)
            }
        }
        if (!added) ready(false)
    }

    private fun add(
        app: Context,
        id: String,
        direction: Int,
        onAnswer: () -> Unit,
        failed: () -> Unit = {},
        attached: CallControlScope.() -> Unit,
    ): Boolean {
        val calls = managerOf(app) ?: return false
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
                        direction = direction,
                        callType = CallAttributesCompat.CALL_TYPE_AUDIO_CALL,
                        callCapabilities = CallAttributesCompat.SUPPORTS_SET_INACTIVE,
                    ),
                    onAnswer = { onAnswer() },
                    onDisconnect = { cause -> onSystemDisconnect(app, id, cause) },
                    onSetActive = {},
                    onSetInactive = {},
                ) {
                    synchronized(lock) { if (callId == id) control = this }
                    NativeTrace.record("telecom", "attached", if (direction == CallAttributesCompat.DIRECTION_OUTGOING) "outgoing" else "incoming")
                    launch {
                        availableEndpoints.collect { list ->
                            synchronized(lock) { endpoints = list }
                            if (list.isNotEmpty()) routeDefault()
                            CallControls.endpointsChanged()
                        }
                    }
                    launch {
                        currentCallEndpoint.collect { endpoint ->
                            synchronized(lock) { routed = endpoint }
                            CallControls.routedBySystem(app, endpoint.type == CallEndpointCompat.TYPE_SPEAKER)
                            CallControls.endpointsChanged()
                        }
                    }
                    launch { isMuted.collect { muted -> CallControls.mutedBySystem(app, muted) } }
                    attached()
                }
            } catch (refused: CallException) {
                NativeTrace.record("telecom", "failed", "add-call")
                failed()
            } catch (unsupported: UnsupportedOperationException) {
                NativeTrace.record("telecom", "failed", "unsupported")
                failed()
            } catch (denied: SecurityException) {
                NativeTrace.record("telecom", "failed", "security")
                failed()
            } finally {
                synchronized(lock) {
                    if (callId == id) {
                        control = null
                        callId = null
                        endpoints = emptyList()
                        routed = null
                        state = TelecomCallState.Idle
                    }
                }
            }
        }
        synchronized(lock) { job = started }
        return true
    }

    private fun markActive(id: String) {
        synchronized(lock) {
            if (callId == id) {
                state = TelecomCallState.Active
                defaultRoutePending = true
            }
        }
        routeDefault()
    }

    private fun routeDefault() {
        val available = synchronized(lock) {
            if (!defaultRoutePending || state != TelecomCallState.Active || endpoints.isEmpty()) return
            defaultRoutePending = false
            endpoints.map { it.type }
        }
        if (speakerByDefault(available)) route(speaker = true)
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
            if (answered) markActive(id)
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
            routed = null
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

    fun endpointChoices(): List<EndpointChoice> =
        synchronized(lock) {
            endpoints.map { endpoint ->
                EndpointChoice(
                    id = endpoint.identifier.toString(),
                    kind = endpointKindOf(endpoint.type),
                    name = endpoint.name.toString(),
                    active = endpoint.identifier == routed?.identifier,
                )
            }
        }

    fun select(id: String) {
        val (control, target) = synchronized(lock) { Pair(control, endpoints.firstOrNull { it.identifier.toString() == id }) }
        if (control == null || target == null) return
        scope.launch {
            val result = runCatching { control.requestEndpointChange(target) }.getOrNull()
            NativeTrace.record("telecom", if (result is CallControlResult.Success) "route" else "failed", endpointKindOf(target.type))
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
                routed = null
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

internal fun speakerByDefault(available: List<Int>): Boolean =
    CallEndpointCompat.TYPE_SPEAKER in available &&
        CallEndpointCompat.TYPE_BLUETOOTH !in available &&
        CallEndpointCompat.TYPE_WIRED_HEADSET !in available

internal data class EndpointChoice(val id: String, val kind: String, val name: String, val active: Boolean)

internal fun endpointKindOf(type: Int): String =
    when (type) {
        CallEndpointCompat.TYPE_EARPIECE -> "earpiece"
        CallEndpointCompat.TYPE_SPEAKER -> "speaker"
        CallEndpointCompat.TYPE_BLUETOOTH -> "bluetooth"
        CallEndpointCompat.TYPE_WIRED_HEADSET -> "wired"
        CallEndpointCompat.TYPE_STREAMING -> "streaming"
        else -> "unknown"
    }

internal fun endpointsJson(choices: List<EndpointChoice>): String =
    org.json.JSONArray(
        choices.map { choice ->
            org.json.JSONObject()
                .put("id", choice.id)
                .put("kind", choice.kind)
                .put("name", choice.name)
                .put("active", choice.active)
        },
    ).toString()
