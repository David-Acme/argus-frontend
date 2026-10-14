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

    fun fullScreenExplanationShown(): Boolean = prefs.getBoolean(KEY_FULL_SCREEN_SHOWN, false)

    fun markFullScreenExplanationShown() {
        prefs.edit().putBoolean(KEY_FULL_SCREEN_SHOWN, true).apply()
    }

    @Synchronized
    fun addDecline(callId: String) {
        val declines = readDeclines() + callId
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

    @Synchronized
    fun clearDurable() {
        prefs.edit()
            .remove(KEY_TOKEN)
            .remove(KEY_DECLINES)
            .remove(KEY_SEEN)
            .apply()
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

    private companion object {
        const val PREFS = "argus.push.state"
        const val STORE_KEY_ALIAS = "argus.push.store"
        const val KEY_TOKEN = "token"
        const val KEY_DECLINES = "declines"
        const val KEY_SEEN = "seen"
        const val KEY_FULL_SCREEN_SHOWN = "fullScreenExplanationShown"
    }
}
