package com.davidacme.argus.push

import android.app.Activity
import android.app.Application
import android.os.Bundle
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicBoolean

object PushActivityTracker {
    private val installed = AtomicBoolean(false)

    @Volatile
    private var appResumed: WeakReference<Activity>? = null

    @Volatile
    private var appActivity: WeakReference<Activity>? = null

    fun install(application: Application) {
        if (!installed.compareAndSet(false, true)) return
        application.registerActivityLifecycleCallbacks(
            object : Application.ActivityLifecycleCallbacks {
                override fun onActivityResumed(activity: Activity) {
                    if (activity !is CallActivity) {
                        appResumed = WeakReference(activity)
                        appActivity = WeakReference(activity)
                    }
                    KeyguardCall.onResumed(activity)
                }

                override fun onActivityPaused(activity: Activity) {
                    if (appResumed?.get() === activity) appResumed = null
                }

                override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
                    if (activity !is CallActivity) appActivity = WeakReference(activity)
                    KeyguardCall.onCreated(activity)
                }

                override fun onActivityStarted(activity: Activity) = Unit

                override fun onActivityStopped(activity: Activity) = Unit

                override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit

                override fun onActivityDestroyed(activity: Activity) {
                    if (appActivity?.get() === activity) appActivity = null
                    KeyguardCall.release(activity)
                }
            },
        )
    }

    fun appInForeground(): Boolean = appResumed?.get() != null

    fun appActivity(): Activity? = appActivity?.get()

    fun moveToBackground(): Boolean {
        val activity = appResumed?.get() ?: return false
        return activity.moveTaskToBack(true)
    }
}
