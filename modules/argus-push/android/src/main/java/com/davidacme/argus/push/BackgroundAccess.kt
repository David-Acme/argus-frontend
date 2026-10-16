package com.davidacme.argus.push

import android.app.ActivityManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings

internal enum class BackgroundStep { Granted, AskExemption, OpenAppSettings }

internal fun backgroundStepOf(exempt: Boolean, restricted: Boolean): BackgroundStep =
    when {
        !exempt -> BackgroundStep.AskExemption
        restricted -> BackgroundStep.OpenAppSettings
        else -> BackgroundStep.Granted
    }

internal object BackgroundAccess {
    fun restricted(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return false
        return context.getSystemService(ActivityManager::class.java)?.isBackgroundRestricted ?: false
    }

    fun exempt(context: Context): Boolean =
        context.getSystemService(PowerManager::class.java)?.isIgnoringBatteryOptimizations(context.packageName) ?: true

    fun step(context: Context): BackgroundStep = backgroundStepOf(exempt(context), restricted(context))

    fun request(context: Context) {
        val uri = Uri.fromParts("package", context.packageName, null)
        val intent = when (step(context)) {
            BackgroundStep.Granted -> return
            BackgroundStep.AskExemption -> Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, uri)
            BackgroundStep.OpenAppSettings -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, uri)
        }
        NativeTrace.record("ongoing", "restricted", if (intent.action == Settings.ACTION_APPLICATION_DETAILS_SETTINGS) "open-app-settings" else "ask-exemption")
        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (missing: ActivityNotFoundException) {
            context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
    }
}
