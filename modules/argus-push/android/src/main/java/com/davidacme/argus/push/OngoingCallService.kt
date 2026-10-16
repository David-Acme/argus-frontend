package com.davidacme.argus.push

import android.app.Notification
import android.app.PendingIntent
import android.app.Person
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.os.Build
import android.os.IBinder

internal class OngoingCallService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val callId = intent?.getStringExtra(EXTRA_CALL_ID)
        if (intent?.action != ACTION_START || callId.isNullOrEmpty()) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        val outside = intent.getBooleanExtra(EXTRA_OUTSIDE, false)
        val notification = notificationFor(callId, outside)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
            )
        } else {
            startForeground(ID, notification)
        }
        NativeTrace.record("ongoing", "shown", if (outside) "outside" else "inside")
        return START_NOT_STICKY
    }

    private fun notificationFor(callId: String, outside: Boolean): Notification {
        val copy = ongoingCallCopy(PushText.isSpanish())
        val open = PendingIntent.getActivity(
            this,
            0,
            PushActions.launchIntent(this, callDeepLink(callId, outside)).apply {
                if (outside) putExtra(KeyguardCall.EXTRA_SHOW_OVER_LOCK, true)
            },
            FLAGS,
        )
        val hangUp = PendingIntent.getBroadcast(
            this,
            1,
            Intent(this, PushActionReceiver::class.java)
                .setAction(PushActions.ACTION_HANG_UP)
                .putExtra(PushActions.EXTRA_CALL_ID, callId),
            FLAGS,
        )
        val builder = Notification.Builder(this, PushChannels.CALLS)
            .setSmallIcon(applicationInfo.icon)
            .setContentTitle(copy.title)
            .setContentIntent(open)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_CALL)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val person = Person.Builder().setName("Argus").setImportant(true).build()
            builder.setStyle(Notification.CallStyle.forOngoingCall(person, hangUp))
        } else {
            val icon = Icon.createWithResource(this, applicationInfo.icon)
            builder.addAction(Notification.Action.Builder(icon, copy.hangUp, hangUp).build())
        }
        return builder.build()
    }

    companion object {
        const val ACTION_START = "com.davidacme.argus.push.ONGOING_START"
        const val EXTRA_CALL_ID = "com.davidacme.argus.push.ONGOING_CALL_ID"
        const val EXTRA_OUTSIDE = "com.davidacme.argus.push.ONGOING_OUTSIDE"
        const val ID = 7046
        private const val FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

        fun intent(context: Context, callId: String, outside: Boolean): Intent =
            Intent(context, OngoingCallService::class.java)
                .setAction(ACTION_START)
                .putExtra(EXTRA_CALL_ID, callId)
                .putExtra(EXTRA_OUTSIDE, outside)
    }
}
