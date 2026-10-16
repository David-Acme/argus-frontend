package com.davidacme.argus.push

import android.app.ActivityManager
import android.content.Context

internal object AppForeground {
    fun isForegroundImportance(importance: Int): Boolean =
        importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND

    fun isForeground(context: Context): Boolean {
        val info = ActivityManager.RunningAppProcessInfo()
        ActivityManager.getMyMemoryState(info)
        return isForegroundImportance(info.importance)
    }
}
