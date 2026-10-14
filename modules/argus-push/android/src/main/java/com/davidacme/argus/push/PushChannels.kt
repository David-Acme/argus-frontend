package com.davidacme.argus.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

internal object PushChannels {
    const val CRITICAL = "argus-critical"
    const val TIME_SENSITIVE = "argus-time-sensitive"
    const val NORMAL = "argus-normal"
    const val CALLS = "argus-calls"

    fun forUrgency(urgency: String): String =
        when (urgency) {
            "critical" -> CRITICAL
            "time_sensitive", "high" -> TIME_SENSITIVE
            else -> NORMAL
        }

    fun ensure(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val spanish = PushText.isSpanish()
        val channels = listOf(
            channel(CRITICAL, NotificationManager.IMPORTANCE_HIGH, spanish),
            channel(TIME_SENSITIVE, NotificationManager.IMPORTANCE_HIGH, spanish),
            channel(NORMAL, NotificationManager.IMPORTANCE_DEFAULT, spanish),
            silentCalls(spanish),
        )
        manager.createNotificationChannels(channels)
    }

    private fun channel(id: String, importance: Int, spanish: Boolean): NotificationChannel =
        NotificationChannel(id, PushText.channelName(id, spanish), importance)

    private fun silentCalls(spanish: Boolean): NotificationChannel =
        NotificationChannel(CALLS, PushText.channelName(CALLS, spanish), NotificationManager.IMPORTANCE_HIGH).apply {
            setSound(null, null)
            enableVibration(false)
        }
}
