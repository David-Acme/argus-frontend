package com.davidacme.argus.push

import android.media.AudioManager
import org.junit.Assert.assertEquals
import org.junit.Test

class CallAudioTest {
    @Test
    fun aFinishedCallRestoresTheNormalAudioMode() {
        assertEquals(AudioManager.MODE_NORMAL, CallAudio.restoredMode())
    }
}
