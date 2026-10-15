package com.davidacme.argus.push

internal object PushTokenEvents {
    @Volatile
    var listener: ((String) -> Unit)? = null

    fun rotated(token: String) {
        listener?.invoke(token)
    }
}
