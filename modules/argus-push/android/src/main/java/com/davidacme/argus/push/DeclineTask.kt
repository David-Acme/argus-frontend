package com.davidacme.argus.push

import android.content.Context
import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

internal const val DECLINE_TASK_NAME = "ArgusDecline"
internal const val DECLINE_TASK_TIMEOUT_MS = 10_000L
internal const val EXTRA_DECLINE_CALL_ID = "com.davidacme.argus.push.DECLINE_CALL_ID"

internal enum class DeclineRoute { Listener, Headless }

internal fun declineRouteOf(listenerPresent: Boolean): DeclineRoute =
    if (listenerPresent) DeclineRoute.Listener else DeclineRoute.Headless

internal object DeclineTask {
    fun start(context: Context, callId: String): Boolean =
        try {
            context.startService(Intent(context, DeclineTaskService::class.java).putExtra(EXTRA_DECLINE_CALL_ID, callId)) != null
        } catch (refused: IllegalStateException) {
            false
        }
}

class DeclineTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val callId = intent?.getStringExtra(EXTRA_DECLINE_CALL_ID)?.takeIf { it.isNotEmpty() } ?: return null
        val arguments = Arguments.createMap().apply { putString("callId", callId) }
        return HeadlessJsTaskConfig(DECLINE_TASK_NAME, arguments, DECLINE_TASK_TIMEOUT_MS, true)
    }
}
