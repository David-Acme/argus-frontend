package com.davidacme.argus.push

internal object PushTokenEvents {
    @Volatile
    var listener: ((String) -> Unit)? = null

    fun rotated(token: String) {
        val current = listener ?: return
        runCatching { current(token) }.onFailure {
            PushLog.warn("the token listener failed; the rotated token is saved for the next start")
        }
    }
}
