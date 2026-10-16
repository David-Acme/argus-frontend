package com.davidacme.argus.push

internal object PushAlertEvents {
    @Volatile
    var listener: ((String) -> Unit)? = null

    fun bound(): Boolean = listener != null

    fun deliver(alertJson: String): Boolean {
        val current = listener ?: return false
        return runCatching { current(alertJson) }
            .onFailure { PushLog.warn("the alert listener failed; the system alert is posted instead") }
            .isSuccess
    }
}
