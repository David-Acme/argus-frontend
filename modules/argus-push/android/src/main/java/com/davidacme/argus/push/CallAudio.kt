package com.davidacme.argus.push

import android.content.Context
import android.media.AudioManager

object CallAudio {
    fun restoredMode(): Int = AudioManager.MODE_NORMAL

    fun restore(context: Context) {
        val manager = context.getSystemService(AudioManager::class.java) ?: return
        manager.mode = restoredMode()
    }
}
