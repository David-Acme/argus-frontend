package com.davidacme.argus.push

import android.content.Context
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator

internal object AlertAlarm {
    private const val RING_MILLIS = 4_000L
    private val handler = Handler(Looper.getMainLooper())
    private val pattern = longArrayOf(0L, 400L, 200L, 400L)

    fun sound(context: Context) {
        val app = context.applicationContext
        vibrate(app)
        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM) ?: return
        val ringtone = RingtoneManager.getRingtone(app, uri) ?: return
        ringtone.audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        ringtone.play()
        handler.postDelayed({ if (ringtone.isPlaying) ringtone.stop() }, RING_MILLIS)
    }

    private fun vibrate(context: Context) {
        val vibrator = context.getSystemService(Vibrator::class.java) ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(pattern, -1)
        }
    }
}
