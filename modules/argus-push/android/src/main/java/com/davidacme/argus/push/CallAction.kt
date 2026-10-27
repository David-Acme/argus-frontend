package com.davidacme.argus.push

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

internal enum class CallActionKind(val wire: String) {
    Snooze("snooze"),
    Done("done"),
    ;

    companion object {
        fun of(wire: String?): CallActionKind? = entries.firstOrNull { it.wire == wire }
    }
}

internal enum class CallActionOutcome { Snoozed, Done, Denied, Used, Expired, Gone, Unavailable, Unreached }

internal enum class MissedCallAction { MarkDone, CallBack }

internal data class CallActionGrant(
    val callId: String,
    val episode: String,
    val reminderId: Long,
    val token: String,
    val expiresAtSeconds: Long,
    val missedTag: String = "",
)

internal fun missedCallActions(critical: Boolean, reminderLinked: Boolean): List<MissedCallAction> =
    if (!critical && reminderLinked) {
        listOf(MissedCallAction.MarkDone, MissedCallAction.CallBack)
    } else {
        listOf(MissedCallAction.CallBack)
    }

internal object CallActionRules {
    const val CATEGORY_REMINDER = "reminder"
    const val IN_FLIGHT_MS = 15_000L
    private const val KEPT_GRANTS = 8
    private val tokenShape = Regex("[0-9a-f]{64}")

    fun grantOf(intent: PushIntent): CallActionGrant? {
        val reminderCall = intent.kind == PushIntent.KIND_CALL && !intent.cancel &&
            intent.urgency != CRITICAL && intent.category == CATEGORY_REMINDER
        if (!reminderCall || intent.callId.isEmpty() || intent.reminderId <= 0L) return null
        if (!tokenShape.matches(intent.actionToken) || intent.actionExpiresAtSeconds <= 0L) return null
        return CallActionGrant(
            callId = intent.callId,
            episode = intent.episode,
            reminderId = intent.reminderId,
            token = intent.actionToken,
            expiresAtSeconds = intent.actionExpiresAtSeconds,
        )
    }

    fun taskArguments(grant: CallActionGrant, kind: CallActionKind): Map<String, String> =
        mapOf("callId" to grant.callId, "token" to grant.token, "action" to kind.wire)

    fun outcomeOf(kind: CallActionKind, status: Int): CallActionOutcome =
        when (status) {
            in SUCCESS -> if (kind == CallActionKind.Snooze) CallActionOutcome.Snoozed else CallActionOutcome.Done
            FORBIDDEN -> CallActionOutcome.Denied
            CONFLICT -> CallActionOutcome.Used
            GONE -> CallActionOutcome.Expired
            NOT_FOUND -> CallActionOutcome.Gone
            UNAVAILABLE -> CallActionOutcome.Unavailable
            else -> CallActionOutcome.Unreached
        }

    fun retries(outcome: CallActionOutcome): Boolean =
        outcome == CallActionOutcome.Unavailable || outcome == CallActionOutcome.Unreached

    fun succeeded(outcome: CallActionOutcome): Boolean =
        outcome == CallActionOutcome.Snoozed || outcome == CallActionOutcome.Done

    fun usable(grant: CallActionGrant, nowSeconds: Long): Boolean = grant.expiresAtSeconds > nowSeconds

    fun kept(grants: List<CallActionGrant>, nowSeconds: Long): List<CallActionGrant> =
        grants.filter { usable(it, nowSeconds) }.takeLast(KEPT_GRANTS)

    fun withGrant(grants: List<CallActionGrant>, grant: CallActionGrant, nowSeconds: Long): List<CallActionGrant> =
        kept(grants.filterNot { it.callId == grant.callId || sameEpisode(it, grant.episode) } + grant, nowSeconds)

    fun forCall(grants: List<CallActionGrant>, callId: String, nowSeconds: Long): CallActionGrant? =
        grants.lastOrNull { it.callId == callId && usable(it, nowSeconds) }

    fun forEpisode(grants: List<CallActionGrant>, episode: String, nowSeconds: Long): CallActionGrant? =
        grants.lastOrNull { sameEpisode(it, episode) && usable(it, nowSeconds) }

    fun encode(grants: List<CallActionGrant>): String =
        JSONArray(
            grants.map { grant ->
                JSONObject()
                    .put("callId", grant.callId)
                    .put("episode", grant.episode)
                    .put("reminderId", grant.reminderId)
                    .put("token", grant.token)
                    .put("expiresAt", grant.expiresAtSeconds)
                    .put("missedTag", grant.missedTag)
            },
        ).toString()

    fun decode(raw: String): List<CallActionGrant> =
        try {
            val array = JSONArray(raw)
            List(array.length()) { index -> array.getJSONObject(index) }.map { obj ->
                CallActionGrant(
                    callId = obj.getString("callId"),
                    episode = obj.optString("episode"),
                    reminderId = obj.getLong("reminderId"),
                    token = obj.getString("token"),
                    expiresAtSeconds = obj.getLong("expiresAt"),
                    missedTag = obj.optString("missedTag"),
                )
            }
        } catch (error: JSONException) {
            emptyList()
        }

    private fun sameEpisode(grant: CallActionGrant, episode: String): Boolean =
        episode.isNotEmpty() && grant.episode == episode

    private const val CRITICAL = "critical"
    private val SUCCESS = 200..299
    private const val FORBIDDEN = 403
    private const val NOT_FOUND = 404
    private const val CONFLICT = 409
    private const val GONE = 410
    private const val UNAVAILABLE = 503
}
