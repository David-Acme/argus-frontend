package com.davidacme.argus.push

import android.app.Activity
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import java.lang.ref.WeakReference

object KeyguardCall {
    const val EXTRA_SHOW_OVER_LOCK = "argus.push.showOverLock"

    private val main by lazy { Handler(Looper.getMainLooper()) }

    @Volatile
    private var shown: WeakReference<Activity>? = null

    fun showOverKeyguard(answeredFromOutside: Boolean, ended: Boolean): Boolean = answeredFromOutside && !ended

    fun attach(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            activity.setShowWhenLocked(true)
            activity.setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            activity.window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
        shown = WeakReference(activity)
    }

    fun release(activity: Activity) {
        if (shown?.get() !== activity) return
        shown = null
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            activity.setShowWhenLocked(false)
            activity.setTurnScreenOn(false)
        } else {
            @Suppress("DEPRECATION")
            activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
    }

    fun callEnded() {
        main.post {
            val activity = shown?.get() ?: return@post
            release(activity)
        }
    }
}
