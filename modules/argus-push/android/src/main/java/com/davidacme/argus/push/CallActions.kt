package com.davidacme.argus.push

import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

internal const val CALL_ACTION_TASK_NAME = "ArgusCallAction"
internal const val CALL_ACTION_TASK_TIMEOUT_MS = 12_000L

internal object CallActions {
    private const val MILLIS = 1000L
    private val inFlight = mutableMapOf<String, Long>()

    fun request(context: Context, callId: String, kind: CallActionKind) {
        val app = context.applicationContext
        val nowMillis = System.currentTimeMillis()
        if (PushStore(app).callGrant(callId, nowMillis / MILLIS) == null) {
            show(app, callId, kind, CallActionOutcome.Expired)
            return
        }
        val claimed = synchronized(inFlight) {
            val started = inFlight[callId]
            (started == null || nowMillis - started >= CallActionRules.IN_FLIGHT_MS).also { if (it) inFlight[callId] = nowMillis }
        }
        if (!claimed) return
        CallSession.silence(app, callId)
        NativeTrace.record("call-action", "queued", kind.wire)
        val started = try {
            app.startService(
                Intent(app, CallActionTaskService::class.java)
                    .putExtra(PushActions.EXTRA_CALL_ID, callId)
                    .putExtra(PushActions.EXTRA_CALL_ACTION, kind.wire),
            ) != null
        } catch (refused: IllegalStateException) {
            false
        }
        if (!started) report(app, callId, kind.wire, 0)
    }

    fun report(context: Context, callId: String, action: String, status: Int) {
        val kind = CallActionKind.of(action) ?: return
        synchronized(inFlight) { inFlight.remove(callId) }
        val outcome = CallActionRules.outcomeOf(kind, status)
        PushLog.info("call action ${kind.wire} on $callId answered $status")
        NativeTrace.record("call-action", if (CallActionRules.succeeded(outcome)) "sent" else "failed", "status-$status")
        show(context.applicationContext, callId, kind, outcome)
    }

    private fun show(app: Context, callId: String, kind: CallActionKind, outcome: CallActionOutcome) {
        val store = PushStore(app)
        val grant = store.callGrant(callId, System.currentTimeMillis() / MILLIS)
        val retry = CallActionRules.retries(outcome) && grant != null
        if (!retry) store.dropCallGrant(callId)
        PushNotifier.postCallActionNotice(
            app,
            CallActionNotice(
                callId = callId,
                tag = grant?.missedTag?.takeIf { it.isNotEmpty() } ?: "call-action-$callId",
                line = PushText.callActionLine(outcome, PushText.isSpanish()),
                retry = kind.takeIf { retry },
            ),
        )
    }
}

class CallActionTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val callId = intent?.getStringExtra(PushActions.EXTRA_CALL_ID)?.takeIf { it.isNotEmpty() } ?: return null
        val kind = CallActionKind.of(intent.getStringExtra(PushActions.EXTRA_CALL_ACTION)) ?: return null
        val grant = PushStore(this).callGrant(callId, System.currentTimeMillis() / 1000L) ?: return null
        val arguments = Arguments.createMap().apply {
            CallActionRules.taskArguments(grant, kind).forEach { (key, value) -> putString(key, value) }
        }
        return HeadlessJsTaskConfig(CALL_ACTION_TASK_NAME, arguments, CALL_ACTION_TASK_TIMEOUT_MS, true)
    }
}
