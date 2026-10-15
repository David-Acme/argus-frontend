package com.davidacme.argus.push

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

internal class RealarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val tag = intent.getStringExtra(RealarmScheduler.EXTRA_TAG) ?: return
        val episode = intent.getStringExtra(RealarmScheduler.EXTRA_EPISODE).orEmpty()
        val channel = intent.getStringExtra(RealarmScheduler.EXTRA_CHANNEL) ?: return
        val copy = AlertCopy(
            title = intent.getStringExtra(RealarmScheduler.EXTRA_TITLE).orEmpty(),
            body = intent.getStringExtra(RealarmScheduler.EXTRA_BODY) ?: return,
            publicTitle = intent.getStringExtra(RealarmScheduler.EXTRA_PUBLIC_TITLE).orEmpty(),
            publicBody = intent.getStringExtra(RealarmScheduler.EXTRA_PUBLIC_BODY).orEmpty(),
        )
        val deepLink = intent.getStringExtra(RealarmScheduler.EXTRA_DEEP_LINK)
        val ringStarted = PushStore(context).ringStarted(episode)
        if (RealarmDecision.decide(episode, ringStarted) == RealarmAction.Realarm) {
            PushNotifier.cancelAlert(context, tag)
            PushNotifier.postAlert(context, tag, channel, copy, deepLink)
        }
    }
}
