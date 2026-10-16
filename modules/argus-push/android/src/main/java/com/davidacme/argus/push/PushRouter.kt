package com.davidacme.argus.push

import android.content.Context
import android.net.Uri
import android.util.Base64
import org.json.JSONObject

internal class PushRouter(private val context: Context) {
    private val store = PushStore(context)

    fun route(data: Map<String, String>) {
        val now = System.currentTimeMillis() / MILLIS
        val envelope = data[ENVELOPE_KEY]?.let(::decodeEnvelope)
        if (envelope == null) {
            showGeneric(now, deliveryKey = null)
            return
        }
        val intent = openSealed(envelope)?.let { PushIntent.parse(String(it, Charsets.UTF_8)) }
        if (intent == null) {
            PushLog.info("push received without a readable intent")
            showGeneric(now, deliveryKey = envelope.deliveryId.joinToString("") { "%02x".format(it) })
            return
        }
        PushLog.info("push received kind=${intent.kind} cancel=${intent.cancel}")
        if (DedupRules.dropsIntent(intent.kind, intent.cancel, intent.expiresAtSeconds, now)) {
            PushLog.info("push dropped as expired kind=${intent.kind}")
            return
        }
        val intentKey = "intent:${intent.intentId}"
        if (store.isSeen(intentKey, now)) return
        store.remember(intentKey, now)
        when (intent.kind) {
            PushIntent.KIND_ALERT -> showAlert(intent)
            PushIntent.KIND_CALL -> routeCall(intent, now)
        }
    }

    private fun openSealed(envelope: SealedEnvelope): ByteArray? =
        runCatching {
            val keys = PushKeys(context)
            SealedPushOpener(keys.hybridDecrypt(), keys.keyId()).open(envelope)
        }.getOrNull()

    private fun showAlert(intent: PushIntent) {
        val channel = PushChannels.forUrgency(intent.urgency)
        val body = intent.body.ifEmpty { PushText.generic(PushText.isSpanish(), channel != PushChannels.NORMAL) }
        val deepLink = intent.notificationId.takeIf { it.isNotEmpty() }?.let {
            "argus://notification?notificationId=${Uri.encode(it)}"
        }
        val copy = PushVisibility.alertCopy(
            intent.type,
            intent.title,
            body,
            PushText.isSpanish(),
            channel != PushChannels.NORMAL,
        )
        val critical = channel == PushChannels.CRITICAL
        val foreground = AppForeground.isForeground(context)
        val route = AlertSurface.route(foreground, PushAlertEvents.bound(), critical)
        val banner = route.inAppBanner && PushAlertEvents.deliver(alertJson(intent.intentId, copy, critical, deepLink))
        PushLog.info("alert type=${intent.type} public=${copy.publicTitle} foreground=$foreground banner=$banner")
        if (banner) {
            if (route.alarm) AlertAlarm.sound(context)
        } else {
            PushNotifier.postAlert(context, intent.intentId, channel, copy, deepLink)
        }
    }

    private fun alertJson(intentId: String, copy: AlertCopy, critical: Boolean, deepLink: String?): String =
        JSONObject()
            .put("intentId", intentId)
            .put("title", copy.title)
            .put("body", copy.body)
            .put("critical", critical)
            .put("deepLink", deepLink.orEmpty())
            .toString()

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

    private fun showGeneric(now: Long, deliveryKey: String?) {
        if (deliveryKey != null) {
            val key = "delivery:$deliveryKey"
            if (store.isSeen(key, now)) return
            store.remember(key, now)
        }
        val copy = PushVisibility.alertCopy(
            type = "",
            title = "",
            body = PushText.generic(PushText.isSpanish(), urgent = false),
            spanish = PushText.isSpanish(),
            urgent = false,
        )
        PushNotifier.postAlert(context, deliveryKey ?: "generic-$now", PushChannels.NORMAL, copy, null)
    }

    private fun decodeEnvelope(encoded: String): SealedEnvelope? =
        try {
            SealedEnvelope.parse(Base64.decode(encoded, Base64.DEFAULT))
        } catch (error: IllegalArgumentException) {
            null
        }

    private companion object {
        const val MILLIS = 1000L
        const val ENVELOPE_KEY = "e"
    }
}
