package com.davidacme.argus.push

internal object PushTokenEvents {
    @Volatile
    var listener: ((String) -> Unit)? = null

    fun rotated(token: String) {
        val current = listener ?: return
        runCatching { current(token) }
    }
}
