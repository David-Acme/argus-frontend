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
    const val SILENT_ALERTS = "argus-alerts-silent"
    const val ONGOING = "argus-ongoing-call"
    const val SUMMARY = "argus-call-summary"

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
            silentAlerts(spanish),
            ongoing(spanish),
            summary(spanish),
        )
        manager.createNotificationChannels(channels)
    }

    private fun channel(id: String, importance: Int, spanish: Boolean): NotificationChannel =
        NotificationChannel(id, PushText.channelName(id, spanish), importance)

    private fun ongoing(spanish: Boolean): NotificationChannel =
        NotificationChannel(ONGOING, PushText.channelName(ONGOING, spanish), NotificationManager.IMPORTANCE_DEFAULT).apply {
            setSound(null, null)
            enableVibration(false)
        }

    private fun summary(spanish: Boolean): NotificationChannel =
        NotificationChannel(SUMMARY, PushText.channelName(SUMMARY, spanish), NotificationManager.IMPORTANCE_LOW).apply {
            setSound(null, null)
            enableVibration(false)
        }

    private fun silentAlerts(spanish: Boolean): NotificationChannel =
        NotificationChannel(SILENT_ALERTS, PushText.channelName(SILENT_ALERTS, spanish), NotificationManager.IMPORTANCE_HIGH).apply {
            setSound(null, null)
            enableVibration(false)
        }

    private fun silentCalls(spanish: Boolean): NotificationChannel =
        NotificationChannel(CALLS, PushText.channelName(CALLS, spanish), NotificationManager.IMPORTANCE_HIGH).apply {
            setSound(null, null)
            enableVibration(false)
        }
}
