package com.davidacme.argus.push

import android.content.Context
import android.net.Uri
import android.util.Base64

internal class PushRouter(private val context: Context) {
    private val store = PushStore(context)

    fun route(data: Map<String, String>) {
        val now = System.currentTimeMillis() / MILLIS
        val urgency = data["urgency"].orEmpty()
        val envelope = data["envelope"]?.let(::decodeEnvelope)
        if (envelope == null) {
            showGeneric(urgency, now, deliveryKey = null)
            return
        }
        val plain = SealedPushOpener.open(envelope)
        val intent = plain?.let { PushIntent.parse(String(it, Charsets.UTF_8)) }
        if (intent == null) {
            showGeneric(urgency, now, deliveryKey = envelope.deliveryId.joinToString("") { "%02x".format(it) })
            return
        }
        if (DedupRules.isExpired(intent.expiresAtSeconds, now)) return
        val intentKey = "intent:${intent.intentId}"
        if (store.isSeen(intentKey, now)) return
        store.remember(intentKey, now)
        when (intent.kind) {
            PushIntent.KIND_ALERT -> showAlert(intent)
            PushIntent.KIND_CALL -> routeCall(intent, now)
        }
    }

    private fun showAlert(intent: PushIntent) {
        val channel = PushChannels.forUrgency(intent.urgency)
        val body = intent.body.ifEmpty { PushText.generic(PushText.isSpanish(), channel != PushChannels.NORMAL) }
        val deepLink = intent.notificationId.takeIf { it.isNotEmpty() }?.let {
            "argus://notification?notificationId=${Uri.encode(it)}"
        }
        PushNotifier.postAlert(context, intent.intentId, channel, body, deepLink)
    }

    private fun routeCall(intent: PushIntent, now: Long) {
        val callId = intent.callId
        if (callId.isEmpty()) return
        if (intent.cancel) {
            store.remember("cancel:$callId", now)
            CallSession.cancel(context, callId)
            return
        }
        if (store.isSeen("cancel:$callId", now) || store.isSeen("call:$callId", now)) return
        store.remember("call:$callId", now)
        CallSession.ring(context, callId, intent.expiresAtSeconds)
    }

    private fun showGeneric(urgency: String, now: Long, deliveryKey: String?) {
        if (deliveryKey != null) {
            val key = "delivery:$deliveryKey"
            if (store.isSeen(key, now)) return
            store.remember(key, now)
        }
        val channel = PushChannels.forUrgency(urgency)
        val body = PushText.generic(PushText.isSpanish(), channel != PushChannels.NORMAL)
        PushNotifier.postAlert(context, deliveryKey ?: "generic-$now", channel, body, null)
    }

    private fun decodeEnvelope(encoded: String): SealedEnvelope? =
        try {
            SealedEnvelope.parse(Base64.decode(encoded, Base64.DEFAULT))
        } catch (error: IllegalArgumentException) {
            null
        }

    private companion object {
        const val MILLIS = 1000L
    }
}
