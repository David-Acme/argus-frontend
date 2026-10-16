package com.davidacme.argus.push

internal object PushLog {
    const val TAG = "ArgusPush"

    @Volatile
    var sink: (String) -> Unit = { message -> android.util.Log.w(TAG, message) }

    @Volatile
    var infoSink: (String) -> Unit = { message -> android.util.Log.i(TAG, message) }

    fun warn(message: String) {
        sink(message)
    }

    fun info(message: String) {
        infoSink(message)
    }
}
