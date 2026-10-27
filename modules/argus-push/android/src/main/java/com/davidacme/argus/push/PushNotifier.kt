package com.davidacme.argus.push

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.Person
import androidx.core.graphics.drawable.IconCompat
import com.margelo.nitro.push.R

internal data class CallSummary(val title: String, val body: String)

internal data class CallActionNotice(val callId: String, val tag: String, val line: String, val retry: CallActionKind?)

internal object PushNotifier {
    private const val ALERT_NOTIFICATION_ID = 1
    private const val SUMMARY_NOTIFICATION_ID = 2
    private const val SUMMARY_TAG = "argus-call-summary"
    private const val MISSED_GROUP = "argus-missed-calls"
    private const val CALL_BACK_LINK = "argus://call"
    private const val CALLER_ICON_PX = 192

    fun canUseFullScreen(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) return true
        val manager = context.getSystemService(NotificationManager::class.java) ?: return false
        return manager.canUseFullScreenIntent()
    }

    fun postAlert(
        context: Context,
        tag: String,
        channelId: String,
        copy: AlertCopy,
        deepLink: String?,
        markDone: CallActionGrant? = null,
    ) {
        PushChannels.ensure(context)
        val smallIcon = if (copy.callBack) R.drawable.argus_ic_phone else context.applicationInfo.icon
        val actions = if (copy.callBack) missedActions(context, tag, markDone) else emptyList()
        val publicVersion = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(smallIcon)
            .setContentTitle(copy.publicTitle)
            .setContentText(copy.publicBody)
            .apply { actions.forEach { addAction(it) } }
            .build()
        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(smallIcon)
            .setContentTitle(copy.title)
            .setContentText(copy.body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(copy.body))
            .setAutoCancel(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setPublicVersion(publicVersion)
            .setContentIntent(activity(context, tag.hashCode(), PushActions.launchIntent(context, deepLink)))
            .apply { actions.forEach { addAction(it) } }
        if (copy.callBack) {
            builder.setGroup(MISSED_GROUP)
            NativeTrace.record("ongoing", "shown", if (markDone != null) "missed-mark-done-action" else "missed-call-back-action")
        }
        NotificationManagerCompat.from(context).notify(tag, ALERT_NOTIFICATION_ID, builder.build())
    }

    fun cancelAlert(context: Context, tag: String) {
        NotificationManagerCompat.from(context).cancel(tag, ALERT_NOTIFICATION_ID)
    }

    fun cancelMissedCalls(context: Context) {
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        manager.activeNotifications
            .filter { it.notification.group == MISSED_GROUP }
            .forEach { manager.cancel(it.tag, it.id) }
    }

    fun postCall(context: Context, info: RingInfo, fullScreen: Boolean, timeoutMillis: Long) {
        PushChannels.ensure(context)
        val spanish = PushText.isSpanish()
        val mood = if (info.critical) EstelaMood.Alert else EstelaMood.Idle
        val caller = Person.Builder()
            .setName(PushText.TITLE)
            .setIcon(IconCompat.createWithBitmap(EstelaStill.bitmap(CALLER_ICON_PX, mood)))
            .setImportant(true)
            .build()
        val answer = activity(context, requestCode(info.callId, ANSWER), callIntent(context, PushActions.ACTION_ANSWER, info.callId))
        val decline = broadcast(context, requestCode(info.callId, DECLINE), info.callId)
        val builder = NotificationCompat.Builder(context, PushChannels.CALLS)
            .setSmallIcon(R.drawable.argus_ic_phone)
            .setContentTitle(if (info.critical) PushText.criticalTitle(spanish) else PushText.incomingTitle(spanish))
            .setContentText(PushText.ringTitle(info.subject))
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .setAutoCancel(false)
            .setTimeoutAfter(timeoutMillis)
            .setStyle(NotificationCompat.CallStyle.forIncomingCall(caller, decline, answer))
        if (ringChoices(info.critical, info.snoozable).contains(RingChoice.Snooze)) {
            builder.addAction(callAction(context, info.callId, CallActionKind.Snooze))
        }
        if (fullScreen) {
            builder.setFullScreenIntent(activity(context, requestCode(info.callId, FULL_SCREEN), callIntent(context, PushActions.ACTION_SHOW_CALL, info.callId)), true)
        }
        NotificationManagerCompat.from(context).notify(CallEndPlan.NOTIFICATION_ID, builder.build())
    }

    fun cancelCall(context: Context, plan: CallEnd) {
        if (plan.cancelNotification) NotificationManagerCompat.from(context).cancel(plan.notificationId)
    }

    fun postCallSummary(context: Context, summary: CallSummary) {
        PushChannels.ensure(context)
        val builder = NotificationCompat.Builder(context, PushChannels.SUMMARY)
            .setSmallIcon(R.drawable.argus_ic_phone)
            .setLargeIcon(EstelaStill.bitmap(CALLER_ICON_PX, EstelaMood.Idle))
            .setContentTitle(summary.title)
            .setContentText(summary.body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(summary.body))
            .setSilent(true)
            .setAutoCancel(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setContentIntent(activity(context, SUMMARY_TAG.hashCode(), PushActions.launchIntent(context, null)))
        NotificationManagerCompat.from(context).notify(SUMMARY_TAG, SUMMARY_NOTIFICATION_ID, builder.build())
        NativeTrace.record("ongoing", "shown", "call-summary-silent")
    }

    fun postCallActionNotice(context: Context, notice: CallActionNotice) {
        PushChannels.ensure(context)
        val builder = NotificationCompat.Builder(context, PushChannels.SUMMARY)
            .setSmallIcon(R.drawable.argus_ic_phone)
            .setContentTitle(PushText.TITLE)
            .setContentText(notice.line)
            .setGroup(MISSED_GROUP)
            .setSilent(true)
            .setAutoCancel(true)
            .setContentIntent(activity(context, notice.tag.hashCode(), PushActions.launchIntent(context, null)))
        notice.retry?.let { builder.addAction(callAction(context, notice.callId, it)) }
        NotificationManagerCompat.from(context).notify(notice.tag, ALERT_NOTIFICATION_ID, builder.build())
    }

    private fun missedActions(context: Context, tag: String, markDone: CallActionGrant?): List<NotificationCompat.Action> =
        missedCallActions(critical = false, reminderLinked = markDone != null).map { action ->
            when (action) {
                MissedCallAction.MarkDone -> callAction(context, markDone?.callId.orEmpty(), CallActionKind.Done)
                MissedCallAction.CallBack -> NotificationCompat.Action.Builder(
                    R.drawable.argus_ic_phone,
                    PushText.callBack(PushText.isSpanish()),
                    activity(context, tag.hashCode() + CALL_BACK, PushActions.launchIntent(context, CALL_BACK_LINK)),
                ).build()
            }
        }

    private fun callAction(context: Context, callId: String, kind: CallActionKind): NotificationCompat.Action {
        val spanish = PushText.isSpanish()
        val (icon, label, purpose) = when (kind) {
            CallActionKind.Snooze -> Triple(R.drawable.argus_ic_clock, PushText.snooze(spanish), SNOOZE)
            CallActionKind.Done -> Triple(R.drawable.argus_ic_phone, PushText.markDone(spanish), MARK_DONE)
        }
        val intent = Intent(context, PushActionReceiver::class.java)
            .setAction(PushActions.ACTION_CALL_ACTION)
            .putExtra(PushActions.EXTRA_CALL_ID, callId)
            .putExtra(PushActions.EXTRA_CALL_ACTION, kind.wire)
        val pending = PendingIntent.getBroadcast(
            context,
            requestCode(callId, purpose),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Action.Builder(icon, label, pending).build()
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
    private const val CALL_BACK = 5
    private const val SNOOZE = 6
    private const val MARK_DONE = 7
}
