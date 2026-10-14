package com.davidacme.argus.push

import android.content.ComponentName
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.telecom.PhoneAccount
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager

internal object TelecomCalls {
    const val EXTRA_CALL_ID = "com.davidacme.argus.push.CALL_ID_EXTRA"
    private const val ACCOUNT_ID = "argus-calls"
    private const val LABEL = "Argus"

    fun addIncoming(context: Context, callId: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val telecom = context.getSystemService(TelecomManager::class.java) ?: return
        val handle = handle(context)
        try {
            telecom.registerPhoneAccount(
                PhoneAccount.builder(handle, LABEL)
                    .setCapabilities(PhoneAccount.CAPABILITY_SELF_MANAGED)
                    .build(),
            )
            val callExtras = Bundle().apply { putString(EXTRA_CALL_ID, callId) }
            val extras = Bundle().apply {
                putParcelable(TelecomManager.EXTRA_INCOMING_CALL_ADDRESS, Uri.fromParts("argus", callId, null))
                putBundle(TelecomManager.EXTRA_INCOMING_CALL_EXTRAS, callExtras)
            }
            telecom.addNewIncomingCall(handle, extras)
        } catch (error: SecurityException) {
            return
        } catch (error: IllegalStateException) {
            return
        }
    }

    fun handle(context: Context): PhoneAccountHandle =
        PhoneAccountHandle(ComponentName(context, ArgusConnectionService::class.java), ACCOUNT_ID)
}
