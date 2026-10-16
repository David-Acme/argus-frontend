package com.davidacme.argus.push

import android.app.Activity
import android.app.Application
import android.os.Bundle
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicBoolean

object PushActivityTracker {
    private val installed = AtomicBoolean(false)

    @Volatile
    private var resumed: WeakReference<Activity>? = null

    fun install(application: Application) {
        if (!installed.compareAndSet(false, true)) return
        application.registerActivityLifecycleCallbacks(
            object : Application.ActivityLifecycleCallbacks {
                override fun onActivityResumed(activity: Activity) {
                    resumed = WeakReference(activity)
                }

                override fun onActivityPaused(activity: Activity) {
                    if (resumed?.get() === activity) resumed = null
                }

                override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit

                override fun onActivityStarted(activity: Activity) = Unit

                override fun onActivityStopped(activity: Activity) = Unit

                override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit

                override fun onActivityDestroyed(activity: Activity) = Unit
            },
        )
    }

    fun moveToBackground(): Boolean {
        val activity = resumed?.get() ?: return false
        return activity.moveTaskToBack(true)
    }
}
