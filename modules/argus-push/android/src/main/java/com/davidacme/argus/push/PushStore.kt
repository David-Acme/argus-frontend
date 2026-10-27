package com.davidacme.argus.push

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

internal class PushStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val box = SecretBox(STORE_KEY_ALIAS)

    fun storedToken(): String = prefs.getString(KEY_TOKEN, null).orEmpty()

    fun saveToken(token: String) {
        prefs.edit().putString(KEY_TOKEN, token).apply()
    }

    fun clearToken() {
        prefs.edit().remove(KEY_TOKEN).apply()
    }

    fun fullScreenExplained(): Boolean = prefs.getBoolean(KEY_FULL_SCREEN_EXPLAINED, false)

    fun setFullScreenExplained(value: Boolean) {
        prefs.edit().putBoolean(KEY_FULL_SCREEN_EXPLAINED, value).apply()
    }

    @Synchronized
    fun addDecline(callId: String) {
        val declines = readDeclines() + callId
        prefs.edit().putString(KEY_DECLINES, JSONArray(declines).toString()).apply()
    }

    @Synchronized
    fun removeDecline(callId: String) {
        val declines = readDeclines().filter { it != callId }
        prefs.edit().putString(KEY_DECLINES, JSONArray(declines).toString()).apply()
    }

    @Synchronized
    fun takeDeclines(): List<String> {
        val declines = readDeclines()
        prefs.edit().remove(KEY_DECLINES).apply()
        return declines
    }

    @Synchronized
    fun isSeen(key: String, nowSeconds: Long): Boolean = DedupRules.isSeen(readSeen(), key, nowSeconds)

    @Synchronized
    fun remember(key: String, nowSeconds: Long) {
        val seen = DedupRules.prune(readSeen(), nowSeconds) + (key to nowSeconds)
        writeSeen(seen)
    }

    private fun readDeclines(): List<String> {
        val raw = prefs.getString(KEY_DECLINES, null) ?: return emptyList()
        val array = JSONArray(raw)
        return List(array.length()) { index -> array.getString(index) }
    }

    private fun readSeen(): Map<String, Long> {
        val sealed = prefs.getString(KEY_SEEN, null) ?: return emptyMap()
        val plain = box.open(sealed) ?: return emptyMap()
        val obj = JSONObject(String(plain, Charsets.UTF_8))
        return obj.keys().asSequence().associateWith { key -> obj.getLong(key) }
    }

    private fun writeSeen(seen: Map<String, Long>) {
        val obj = JSONObject()
        seen.forEach { (key, at) -> obj.put(key, at) }
        prefs.edit().putString(KEY_SEEN, box.seal(obj.toString().toByteArray(Charsets.UTF_8))).apply()
    }

    fun saveCallGrant(grant: CallActionGrant, nowSeconds: Long) {
        synchronized(GRANTS_LOCK) { writeGrants(CallActionRules.withGrant(readGrants(), grant, nowSeconds)) }
    }

    fun callGrant(callId: String, nowSeconds: Long): CallActionGrant? =
        synchronized(GRANTS_LOCK) { CallActionRules.forCall(readGrants(), callId, nowSeconds) }

    fun claimMissedGrant(episode: String, tag: String, nowSeconds: Long): CallActionGrant? =
        synchronized(GRANTS_LOCK) {
            val grants = readGrants()
            val grant = CallActionRules.forEpisode(grants, episode, nowSeconds) ?: return null
            val marked = grant.copy(missedTag = tag)
            writeGrants(CallActionRules.withGrant(grants, marked, nowSeconds))
            marked
        }

    fun dropCallGrant(callId: String) {
        synchronized(GRANTS_LOCK) { writeGrants(readGrants().filterNot { it.callId == callId }) }
    }

    private fun readGrants(): List<CallActionGrant> {
        val sealed = prefs.getString(KEY_CALL_GRANTS, null) ?: return emptyList()
        val plain = box.open(sealed) ?: return emptyList()
        return CallActionRules.decode(String(plain, Charsets.UTF_8))
    }

    private fun writeGrants(grants: List<CallActionGrant>) {
        if (grants.isEmpty()) {
            prefs.edit().remove(KEY_CALL_GRANTS).apply()
            return
        }
        prefs.edit().putString(KEY_CALL_GRANTS, box.seal(CallActionRules.encode(grants).toByteArray(Charsets.UTF_8))).apply()
    }

    fun markRingStarted(episode: String, nowSeconds: Long) {
        if (episode.isEmpty()) return
        prefs.edit().putLong(ringKey(episode), nowSeconds).apply()
    }

    fun ringStarted(episode: String): Boolean = episode.isNotEmpty() && prefs.contains(ringKey(episode))

    private fun ringKey(episode: String): String = KEY_RING_PREFIX + episode

    private companion object {
        val GRANTS_LOCK = Any()
        const val KEY_CALL_GRANTS = "callGrants"
        const val PREFS = "argus.push.state"
        const val STORE_KEY_ALIAS = "argus.push.store"
        const val KEY_TOKEN = "token"
        const val KEY_DECLINES = "declines"
        const val KEY_SEEN = "seen"
        const val KEY_FULL_SCREEN_EXPLAINED = "fullScreenExplained"
        const val KEY_RING_PREFIX = "ring:"
    }
}
