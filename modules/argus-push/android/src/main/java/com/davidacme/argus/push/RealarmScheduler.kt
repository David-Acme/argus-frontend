package com.davidacme.argus.push

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings

internal object RealarmScheduler {
    const val EXTRA_TAG = "argus.push.realarm.tag"
    const val EXTRA_EPISODE = "argus.push.realarm.episode"
    const val EXTRA_CHANNEL = "argus.push.realarm.channel"
    const val EXTRA_TITLE = "argus.push.realarm.title"
    const val EXTRA_BODY = "argus.push.realarm.body"
    const val EXTRA_PUBLIC_TITLE = "argus.push.realarm.publicTitle"
    const val EXTRA_PUBLIC_BODY = "argus.push.realarm.publicBody"
    const val EXTRA_DEEP_LINK = "argus.push.realarm.deepLink"

    fun schedule(
        context: Context,
        tag: String,
        episode: String,
        channel: String,
        copy: AlertCopy,
        deepLink: String?,
        nowMillis: Long,
    ): Boolean {
        val manager = context.getSystemService(AlarmManager::class.java) ?: return false
        val intent = Intent(context, RealarmReceiver::class.java)
            .putExtra(EXTRA_TAG, tag)
            .putExtra(EXTRA_EPISODE, episode)
            .putExtra(EXTRA_CHANNEL, channel)
            .putExtra(EXTRA_TITLE, copy.title)
            .putExtra(EXTRA_BODY, copy.body)
            .putExtra(EXTRA_PUBLIC_TITLE, copy.publicTitle)
            .putExtra(EXTRA_PUBLIC_BODY, copy.publicBody)
            .putExtra(EXTRA_DEEP_LINK, deepLink)
        val pending = PendingIntent.getBroadcast(
            context,
            episode.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or immutableFlag(),
        )
        val at = RealarmDecision.triggerAtMillis(nowMillis)
        return try {
            manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending)
            true
        } catch (error: SecurityException) {
            false
        }
    }

    fun exactAlarmsAllowed(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
        return context.getSystemService(AlarmManager::class.java)?.canScheduleExactAlarms() == true
    }

    fun exactAlarmSettingsIntent(context: Context): Intent =
        Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).setData(Uri.parse("package:${context.packageName}"))

    fun cancel(context: Context, episode: String) {
        if (episode.isEmpty()) return
        val manager = context.getSystemService(AlarmManager::class.java) ?: return
        val pending = PendingIntent.getBroadcast(
            context,
            episode.hashCode(),
            Intent(context, RealarmReceiver::class.java),
            PendingIntent.FLAG_NO_CREATE or immutableFlag(),
        ) ?: return
        manager.cancel(pending)
        pending.cancel()
    }

    private fun immutableFlag(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
}
