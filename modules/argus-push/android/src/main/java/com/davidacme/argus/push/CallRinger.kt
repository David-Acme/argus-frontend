package com.davidacme.argus.push

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import java.io.IOException

internal class CallRinger {
    private var player: MediaPlayer? = null
    private var focus: AudioFocusRequest? = null
    private var activeVibrator: Vibrator? = null

    @Synchronized
    fun start(context: Context) {
        if (player != null || activeVibrator != null) return
        val plan = RingDecision.plan(ringerMode(context), vibrateWhileRinging(context))
        if (plan.sound) startSound(context)
        if (plan.vibration == RingVibration.Repeating) startVibration(context)
    }

    @Synchronized
    fun stop(context: Context) {
        player?.let { current ->
            runCatching { current.stop() }
            current.release()
        }
        player = null
        abandonFocus(context)
        activeVibrator?.cancel()
        activeVibrator = null
    }

    private fun ringerMode(context: Context): Int =
        context.getSystemService(AudioManager::class.java)?.ringerMode ?: RingDecision.RINGER_NORMAL

    private fun vibrateWhileRinging(context: Context): Boolean =
        Settings.System.getInt(context.contentResolver, VIBRATE_WHILE_RINGING, 0) == 1

    private fun startSound(context: Context) {
        val uri = RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: return
        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        requestFocus(context, attributes)
        try {
            player = MediaPlayer().apply {
                setAudioAttributes(attributes)
                setDataSource(context, uri)
                isLooping = true
                prepare()
                start()
            }
        } catch (error: IOException) {
            stop(context)
        } catch (error: IllegalStateException) {
            stop(context)
        }
    }

    private fun startVibration(context: Context) {
        val vibrator = vibratorOf(context) ?: return
        if (!vibrator.hasVibrator()) return
        val effect = VibrationEffect.createWaveform(RING_PATTERN_MS, 0)
        when {
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ->
                vibrator.vibrate(effect, VibrationAttributes.createForUsage(VibrationAttributes.USAGE_RINGTONE))
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ->
                vibrator.vibrate(
                    effect,
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build(),
                )
            else -> vibrator.vibrate(RING_PATTERN_MS, 0)
        }
        activeVibrator = vibrator
    }

    private fun vibratorOf(context: Context): Vibrator? =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(VibratorManager::class.java)?.defaultVibrator
        } else {
            context.getSystemService(Vibrator::class.java)
        }

    private fun requestFocus(context: Context, attributes: AudioAttributes) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(AudioManager::class.java) ?: return
        val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
            .setAudioAttributes(attributes)
            .setWillPauseWhenDucked(false)
            .build()
        manager.requestAudioFocus(request)
        focus = request
    }

    private fun abandonFocus(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val request = focus ?: return
        context.getSystemService(AudioManager::class.java)?.abandonAudioFocusRequest(request)
        focus = null
    }

    private companion object {
        const val VIBRATE_WHILE_RINGING = "vibrate_when_ringing"
        val RING_PATTERN_MS = longArrayOf(0L, 1000L, 1000L)
    }
}
