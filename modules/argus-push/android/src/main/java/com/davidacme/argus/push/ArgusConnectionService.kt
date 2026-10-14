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
        val callId = request?.extras?.getString(TelecomCalls.EXTRA_CALL_ID).orEmpty()
        val connection = ArgusConnection(applicationContext, callId)
        connection.setRinging()
        CallSession.attach(applicationContext, callId, connection)
        return connection
    }
}
