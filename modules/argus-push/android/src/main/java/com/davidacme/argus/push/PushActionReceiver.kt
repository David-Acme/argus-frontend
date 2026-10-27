package com.davidacme.argus.push

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class PushActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (ongoingCallActionOf(intent.action)) {
            OngoingCallAction.HangUp -> CallSession.endActive(context)
            OngoingCallAction.Speaker -> CallControls.toggleSpeaker(context)
            OngoingCallAction.Mute -> CallControls.toggleMute(context)
            null -> {
                val callId = intent.getStringExtra(PushActions.EXTRA_CALL_ID) ?: return
                when (intent.action) {
                    PushActions.ACTION_DECLINE -> CallSession.decline(context, callId)
                    PushActions.ACTION_CALL_ACTION -> {
                        val kind = CallActionKind.of(intent.getStringExtra(PushActions.EXTRA_CALL_ACTION)) ?: return
                        CallActions.request(context, callId, kind)
                    }
                }
            }
        }
    }
}
