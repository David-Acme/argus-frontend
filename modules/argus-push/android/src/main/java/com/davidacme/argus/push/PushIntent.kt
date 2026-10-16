package com.davidacme.argus.push

import org.json.JSONException
import org.json.JSONObject

internal data class PushIntent(
    val intentId: String,
    val kind: String,
    val urgency: String,
    val notificationId: String,
    val callId: String,
    val title: String,
    val body: String,
    val expiresAtSeconds: Long,
    val cancel: Boolean,
    val type: String = "",
) {
    companion object {
        const val KIND_ALERT = "alert"
        const val KIND_CALL = "call"

        fun parse(json: String): PushIntent? =
            try {
                parseObject(JSONObject(json))
            } catch (error: JSONException) {
                null
            }

        private fun parseObject(obj: JSONObject): PushIntent? {
            val intentId = obj.optString("intentId")
            val kind = obj.optString("kind")
            val expiresAt = obj.optLong("exp", 0L)
            if (intentId.isEmpty() || expiresAt <= 0L) return null
            if (kind != KIND_ALERT && kind != KIND_CALL) return null
            return PushIntent(
                intentId = intentId,
                kind = kind,
                urgency = obj.optString("urgency", "normal"),
                notificationId = obj.optString("notificationId"),
                callId = obj.optString("callId"),
                title = obj.optString("title"),
                body = obj.optString("body"),
                expiresAtSeconds = expiresAt,
                cancel = obj.optBoolean("cancel", false),
                type = obj.optString("type"),
            )
        }
    }
}
