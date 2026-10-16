package com.davidacme.argus.push

import android.content.Context
import android.telecom.Connection
import android.telecom.DisconnectCause

internal class ArgusConnection(private val context: Context, val callId: String) : Connection() {
    init {
        setConnectionProperties(PROPERTY_SELF_MANAGED)
        setAudioModeIsVoip(true)
    }

    override fun onAnswer() {
        CallSession.answer(context, callId)
    }

    override fun onReject() {
        CallSession.decline(context, callId)
    }

    override fun onDisconnect() {
        CallSession.connectionEnded(context, this)
    }

    fun endWith(cause: Int) {
        setDisconnected(DisconnectCause(cause))
        destroy()
    }
}
