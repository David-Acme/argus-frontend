package com.davidacme.argus.push

import android.app.ActivityManager
import android.content.Context
import android.os.Build

internal object BackgroundAccess {
    fun restricted(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return false
        return context.getSystemService(ActivityManager::class.java)?.isBackgroundRestricted ?: false
    }
}
