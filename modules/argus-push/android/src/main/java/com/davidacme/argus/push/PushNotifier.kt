package com.davidacme.argus.push

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person

internal object PushNotifier {
    private const val ALERT_NOTIFICATION_ID = 1

    fun canUseFullScreen(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true
        val manager = context.getSystemService(NotificationManager::class.java) ?: return false
        return manager.canUseFullScreenIntent()
    }

    fun postAlert(context: Context, tag: String, channelId: String, copy: AlertCopy, deepLink: String?) {
        PushChannels.ensure(context)
        val publicVersion = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle(copy.publicTitle)
            .setContentText(copy.publicBody)
            .build()
        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle(copy.title)
            .setContentText(copy.body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(copy.body))
            .setAutoCancel(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(publicVersion)
            .setContentIntent(activity(context, tag.hashCode(), PushActions.launchIntent(context, deepLink)))
        NotificationManagerCompat.from(context).notify(tag, ALERT_NOTIFICATION_ID, builder.build())
    }

    fun cancelAlert(context: Context, tag: String) {
        NotificationManagerCompat.from(context).cancel(tag, ALERT_NOTIFICATION_ID)
    }

    fun postCall(context: Context, callId: String, fullScreen: Boolean, timeoutMillis: Long) {
        PushChannels.ensure(context)
        val spanish = PushText.isSpanish()
        val caller = Person.Builder().setName(PushText.callTitle(spanish)).setImportant(true).build()
        val answer = activity(context, requestCode(callId, ANSWER), callIntent(context, PushActions.ACTION_ANSWER, callId))
        val decline = broadcast(context, requestCode(callId, DECLINE), callId)
        val builder = NotificationCompat.Builder(context, PushChannels.CALLS)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle(PushText.callTitle(spanish))
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .setAutoCancel(false)
            .setTimeoutAfter(timeoutMillis)
            .setStyle(NotificationCompat.CallStyle.forIncomingCall(caller, decline, answer))
        if (fullScreen) {
            builder.setFullScreenIntent(activity(context, requestCode(callId, FULL_SCREEN), callIntent(context, PushActions.ACTION_SHOW_CALL, callId)), true)
        }
        NotificationManagerCompat.from(context).notify(CallEndPlan.tagFor(callId), CallEndPlan.NOTIFICATION_ID, builder.build())
    }

    fun cancelCall(context: Context, plan: CallEnd) {
        NotificationManagerCompat.from(context).cancel(plan.notificationTag, plan.notificationId)
    }

    private fun callIntent(context: Context, action: String, callId: String): Intent =
        Intent(context, CallActivity::class.java)
            .setAction(action)
            .putExtra(PushActions.EXTRA_CALL_ID, callId)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

    private fun activity(context: Context, requestCode: Int, intent: Intent): PendingIntent =
        PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    private fun broadcast(context: Context, requestCode: Int, callId: String): PendingIntent {
        val intent = Intent(context, PushActionReceiver::class.java)
            .setAction(PushActions.ACTION_DECLINE)
            .putExtra(PushActions.EXTRA_CALL_ID, callId)
        return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun requestCode(callId: String, purpose: Int): Int = callId.hashCode() * 4 + purpose

    private const val ANSWER = 1
    private const val DECLINE = 2
    private const val FULL_SCREEN = 3
}
