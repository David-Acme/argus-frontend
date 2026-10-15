package com.davidacme.argus.push

internal object PushLog {
    const val TAG = "ArgusPush"

    @Volatile
    var sink: (String) -> Unit = { message -> android.util.Log.w(TAG, message) }

    fun warn(message: String) {
        sink(message)
    }
}
