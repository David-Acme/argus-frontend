package com.davidacme.argus.push

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import java.io.IOException

internal class CallRinger {
    private var player: MediaPlayer? = null
    private var focus: AudioFocusRequest? = null

    @Synchronized
    fun start(context: Context) {
        if (player != null) return
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

    @Synchronized
    fun stop(context: Context) {
        player?.let { current ->
            runCatching { current.stop() }
            current.release()
        }
        player = null
        abandonFocus(context)
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
}
