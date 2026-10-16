package com.davidacme.argus.push

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
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

    @Volatile
    private var armed = false

    fun showOverKeyguard(answeredFromOutside: Boolean, ended: Boolean): Boolean = answeredFromOutside && !ended

    fun shouldAttach(armed: Boolean, intentExtra: Boolean, isCallActivity: Boolean): Boolean =
        !isCallActivity && (armed || intentExtra)

    fun arm() {
        armed = true
    }

    fun isShown(): Boolean = shown?.get() != null

    fun isKeyguardLocked(context: Context): Boolean =
        context.getSystemService(KeyguardManager::class.java)?.isKeyguardLocked ?: false

    fun onCreated(activity: Activity) {
        val extra = activity.intent?.getBooleanExtra(EXTRA_SHOW_OVER_LOCK, false) == true
        if (shouldAttach(armed, extra, activity is CallActivity)) attach(activity)
    }

    fun onResumed(activity: Activity) {
        if (shown?.get() === activity || shouldAttach(armed, false, activity is CallActivity)) attach(activity)
    }

    fun attach(activity: Activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            activity.setShowWhenLocked(true)
            activity.setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            activity.window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
        activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
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
        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    fun callEnded() {
        armed = false
        main.post {
            val activity = shown?.get() ?: return@post
            release(activity)
        }
    }
}
