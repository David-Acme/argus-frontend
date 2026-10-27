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
    val subject: String = "",
    val episode: String = "",
    val ringFollows: Boolean = false,
    val category: String = "",
    val reminderId: Long = 0L,
    val actionToken: String = "",
    val actionExpiresAtSeconds: Long = 0L,
) {
    companion object {
        const val KIND_ALERT = "alert"
        const val KIND_CALL = "call"
        const val KIND_NOTIFICATION_ALIAS = "notification"

        fun parse(json: String): PushIntent? =
            try {
                parseObject(JSONObject(json))
            } catch (error: JSONException) {
                null
            }

        private fun parseObject(obj: JSONObject): PushIntent? {
            val intentId = obj.optString("intentId")
            val kind = normalizedKind(obj.optString("kind"))
            val expiresAt = obj.optLong("exp", 0L)
            if (intentId.isEmpty() || expiresAt <= 0L) return null
            if (kind != KIND_ALERT && kind != KIND_CALL) return null
            return PushIntent(
                intentId = intentId,
                kind = kind,
                episode = obj.optString("episode"),
                ringFollows = obj.optBoolean("ringFollows", false),
                urgency = obj.optString("urgency", "normal"),
                notificationId = obj.optString("notificationId"),
                callId = obj.optString("callId"),
                title = obj.optString("title"),
                body = obj.optString("body"),
                expiresAtSeconds = expiresAt,
                cancel = obj.optBoolean("cancel", false),
                type = obj.optString("type"),
                subject = obj.optString("subject"),
                category = obj.optString("category"),
                reminderId = obj.optLong("reminderId", 0L),
                actionToken = obj.optString("actionToken"),
                actionExpiresAtSeconds = obj.optLong("actionExpiresAt", 0L),
            )
        }

        private fun normalizedKind(kind: String): String =
            if (kind == KIND_NOTIFICATION_ALIAS) KIND_ALERT else kind
    }
}
