package com.davidacme.argus.push

import android.app.Notification
import android.app.NotificationManager
import android.app.Person
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build

internal enum class OngoingCallAction { HangUp }

internal fun ongoingCallActionOf(action: String?): OngoingCallAction? =
    if (action == PushActions.ACTION_HANG_UP) OngoingCallAction.HangUp else null

internal data class OngoingCallCopy(val title: String, val hangUp: String)

internal fun ongoingCallCopy(spanish: Boolean): OngoingCallCopy =
    if (spanish) OngoingCallCopy("Llamada en curso", "Colgar") else OngoingCallCopy("Call in progress", "Hang up")

internal object OngoingCall {
    const val TAG = "argus-ongoing-call"
    const val ID = 7046
    private const val FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

    fun show(context: Context, callId: String, enteredFromOutside: Boolean) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val copy = ongoingCallCopy(PushText.isSpanish())
        val open = PendingIntent.getActivity(
            context,
            0,
            PushActions.launchIntent(context, callDeepLink(callId, enteredFromOutside)).apply {
                if (enteredFromOutside) putExtra(KeyguardCall.EXTRA_SHOW_OVER_LOCK, true)
            },
            FLAGS,
        )
        if (enteredFromOutside) KeyguardCall.arm(callId)
        val hangUp = PendingIntent.getBroadcast(
            context,
            1,
            Intent(context, PushActionReceiver::class.java)
                .setAction(PushActions.ACTION_HANG_UP)
                .putExtra(PushActions.EXTRA_CALL_ID, callId),
            FLAGS,
        )
        val icon = Icon.createWithResource(context, context.applicationInfo.icon)
        val builder = Notification.Builder(context, PushChannels.CALLS)
            .setSmallIcon(context.applicationInfo.icon)
            .setContentTitle(copy.title)
            .setContentIntent(open)
            .setOngoing(true)
            .setCategory(Notification.CATEGORY_CALL)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val person = Person.Builder().setName("Argus").setImportant(true).build()
            builder.setStyle(Notification.CallStyle.forOngoingCall(person, hangUp))
        } else {
            builder.addAction(Notification.Action.Builder(icon, copy.hangUp, hangUp).build())
        }
        manager.notify(TAG, ID, builder.build())
        NativeTrace.record("ongoing", "shown", if (enteredFromOutside) "outside" else "inside")
    }

    fun clear(context: Context) {
        context.getSystemService(NotificationManager::class.java)?.cancel(TAG, ID)
        NativeTrace.record("ongoing", "cleared", "call-ended")
    }
}
