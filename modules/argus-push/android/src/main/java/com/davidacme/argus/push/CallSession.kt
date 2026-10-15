package com.davidacme.argus.push

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.telecom.DisconnectCause

internal object CallSession {
    private const val MILLIS = 1000L

    private val handler = Handler(Looper.getMainLooper())
    private val ringer = CallRinger()
    private val lock = Any()
    private var active: ActiveCall? = null
    private var connection: ArgusConnection? = null

    @Volatile
    var declineListener: ((String) -> Unit)? = null

    private class ActiveCall(val callId: String, val expiry: Runnable)

    fun ring(context: Context, callId: String, expiresAtSeconds: Long) {
        val app = context.applicationContext
        val timeoutMillis = expiresAtSeconds * MILLIS - System.currentTimeMillis()
        if (timeoutMillis <= 0L) return
        val replaced = synchronized(lock) {
            if (active?.callId == callId) return
            val previous = active
            previous?.let { handler.removeCallbacks(it.expiry) }
            val expiry = Runnable { expire(app, callId) }
            active = ActiveCall(callId, expiry)
            handler.postDelayed(expiry, timeoutMillis)
            val previousConnection = connection
            connection = null
            Pair(previous?.callId, previousConnection)
        }
        replaced.first?.let { releaseCall(app, it) }
        replaced.second?.endWith(DisconnectCause.OTHER)
        ringer.start(app)
        TelecomCalls.addIncoming(app, callId)
        PushNotifier.postCall(app, callId, PushNotifier.canUseFullScreen(app), timeoutMillis)
    }

    fun attach(context: Context, callId: String, value: ArgusConnection) {
        val matched = synchronized(lock) {
            if (active?.callId == callId) {
                connection = value
                true
            } else {
                false
            }
        }
        if (!matched) value.endWith(DisconnectCause.OTHER)
    }

    fun answer(context: Context, callId: String) {
        val app = context.applicationContext
        releaseCall(app, callId)
        synchronized(lock) { connection }?.takeIf { it.callId == callId }?.setActive()
        PushActions.openCall(app, callId)
    }

    fun decline(context: Context, callId: String) {
        val app = context.applicationContext
        releaseCall(app, callId)
        takeConnection(callId)?.endWith(DisconnectCause.REJECTED)
        deliverDecline(app, callId)
    }

    fun cancel(context: Context, callId: String) {
        val app = context.applicationContext
        releaseCall(app, callId)
        takeConnection(callId)?.endWith(DisconnectCause.OTHER)
    }

    fun endActive(context: Context) {
        val app = context.applicationContext
        val callId = synchronized(lock) { active?.callId ?: connection?.callId } ?: return
        releaseCall(app, callId)
        takeConnection(callId)?.endWith(DisconnectCause.LOCAL)
    }

    fun connectionEnded(context: Context, ended: ArgusConnection) {
        synchronized(lock) {
            if (connection === ended) connection = null
        }
        releaseCall(context.applicationContext, ended.callId)
        ended.endWith(DisconnectCause.LOCAL)
    }

    private fun deliverDecline(context: Context, callId: String) {
        val listener = declineListener
        if (listener == null) {
            PushStore(context).addDecline(callId)
            return
        }
        runCatching { listener(callId) }.onFailure {
            PushLog.warn("the decline listener failed; the decline is kept for the next start")
            PushStore(context).addDecline(callId)
        }
    }

    private fun expire(context: Context, callId: String) {
        if (!releaseCall(context, callId)) return
        takeConnection(callId)?.endWith(DisconnectCause.MISSED)
    }

    private fun releaseCall(context: Context, callId: String): Boolean {
        val matched = synchronized(lock) {
            val current = active
            if (current == null || current.callId != callId) {
                false
            } else {
                handler.removeCallbacks(current.expiry)
                active = null
                true
            }
        }
        if (matched) ringer.stop(context)
        PushNotifier.cancelCall(context, callId)
        return matched
    }

    private fun takeConnection(callId: String): ArgusConnection? =
        synchronized(lock) {
            val current = connection?.takeIf { it.callId == callId }
            if (current != null) connection = null
            current
        }
}
