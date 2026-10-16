package com.davidacme.argus.push

internal object DedupRules {
    const val WINDOW_SECONDS = 24L * 60L * 60L

    fun isSeen(seen: Map<String, Long>, key: String, nowSeconds: Long): Boolean {
        val at = seen[key] ?: return false
        return nowSeconds - at < WINDOW_SECONDS
    }

    fun prune(seen: Map<String, Long>, nowSeconds: Long): Map<String, Long> =
        seen.filterValues { nowSeconds - it < WINDOW_SECONDS }

    fun isExpired(expiresAtSeconds: Long, nowSeconds: Long): Boolean = expiresAtSeconds <= nowSeconds

    fun dropsIntent(kind: String, cancel: Boolean, expiresAtSeconds: Long, nowSeconds: Long): Boolean {
        if (kind == PushIntent.KIND_CALL && cancel) return false
        return isExpired(expiresAtSeconds, nowSeconds)
    }
}
