package com.davidacme.argus.push

import android.telecom.Connection
import android.telecom.ConnectionRequest
import android.telecom.ConnectionService
import android.telecom.PhoneAccountHandle

class ArgusConnectionService : ConnectionService() {
    override fun onCreateIncomingConnection(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?,
    ): Connection {
        val requested = request?.extras?.getString(TelecomCalls.EXTRA_CALL_ID)
        NativeTrace.record("telecom", "start", if (requested.isNullOrEmpty()) "extras-missing" else "extras-present")
        val callId = incomingCallIdOf(requested, CallSession.ringingCallId())
        val connection = ArgusConnection(applicationContext, callId)
        connection.setRinging()
        CallSession.attach(applicationContext, callId, connection)
        return connection
    }

    override fun onCreateIncomingConnectionFailed(
        connectionManagerPhoneAccount: PhoneAccountHandle?,
        request: ConnectionRequest?,
    ) {
        NativeTrace.record("telecom", "failed", "incoming")
    }
}
