package com.davidacme.argus.push

import android.content.Context
import android.content.Intent
import android.net.Uri

internal object PushActions {
    const val ACTION_ANSWER = "com.davidacme.argus.push.ANSWER"
    const val ACTION_DECLINE = "com.davidacme.argus.push.DECLINE"
    const val ACTION_SHOW_CALL = "com.davidacme.argus.push.SHOW_CALL"
    const val EXTRA_CALL_ID = "com.davidacme.argus.push.CALL_ID"

    fun openCall(context: Context, callId: String) {
        open(context, "argus://call?callId=${Uri.encode(callId)}")
    }

    fun openNotification(context: Context, notificationId: String) {
        open(context, "argus://notification?notificationId=${Uri.encode(notificationId)}")
    }

    fun launchIntent(context: Context, deepLink: String?): Intent =
        if (deepLink == null) {
            context.packageManager.getLaunchIntentForPackage(context.packageName)
                ?: Intent(Intent.ACTION_MAIN).setPackage(context.packageName)
        } else {
            appLinkIntent(context, deepLink)
        }

    private fun open(context: Context, deepLink: String) {
        context.startActivity(appLinkIntent(context, deepLink).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    private fun appLinkIntent(context: Context, deepLink: String): Intent =
        Intent(Intent.ACTION_VIEW, Uri.parse(deepLink))
            .setPackage(context.packageName)
            .addCategory(Intent.CATEGORY_BROWSABLE)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
}
