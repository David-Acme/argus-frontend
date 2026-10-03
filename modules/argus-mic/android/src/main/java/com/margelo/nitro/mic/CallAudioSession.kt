package com.margelo.nitro.mic

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import com.margelo.nitro.NitroModules

class CallAudioSession {
  private val lock = Any()
  private var users = 0
  private var previousMode = AudioManager.MODE_NORMAL
  private var previousSpeakerphone = false
  private var routedDevice = false

  fun acquire() {
    synchronized(lock) {
      users += 1
      if (users > 1) return
      val manager = audioManager() ?: return
      previousMode = manager.mode
      runCatching { manager.mode = AudioManager.MODE_IN_COMMUNICATION }
      route(manager)
    }
  }

  fun release() {
    synchronized(lock) {
      if (users == 0) return
      users -= 1
      if (users > 0) return
      val manager = audioManager() ?: return
      unroute(manager)
      runCatching { manager.mode = previousMode }
    }
  }

  private fun route(manager: AudioManager) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val devices = manager.availableCommunicationDevices
      val target = PREFERRED_DEVICE_TYPES.firstNotNullOfOrNull { type -> devices.firstOrNull { it.type == type } }
      routedDevice = target != null && runCatching { manager.setCommunicationDevice(target) }.getOrDefault(false)
      return
    }
    routeLegacy(manager)
  }

  private fun unroute(manager: AudioManager) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      if (routedDevice) runCatching { manager.clearCommunicationDevice() }
      routedDevice = false
      return
    }
    unrouteLegacy(manager)
  }

  @Suppress("DEPRECATION")
  private fun routeLegacy(manager: AudioManager) {
    previousSpeakerphone = manager.isSpeakerphoneOn
    val outputs = manager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
    val hasHeadset = outputs.any { it.type in HEADSET_DEVICE_TYPES }
    if (!hasHeadset) runCatching { manager.isSpeakerphoneOn = true }
  }

  @Suppress("DEPRECATION")
  private fun unrouteLegacy(manager: AudioManager) {
    runCatching { manager.isSpeakerphoneOn = previousSpeakerphone }
  }

  private fun audioManager(): AudioManager? =
    NitroModules.applicationContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  companion object {
    private val HEADSET_DEVICE_TYPES = setOf(
      AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
      AudioDeviceInfo.TYPE_WIRED_HEADSET,
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
      AudioDeviceInfo.TYPE_USB_HEADSET,
    )

    private val PREFERRED_DEVICE_TYPES = listOf(
      AudioDeviceInfo.TYPE_BLE_HEADSET,
      AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
      AudioDeviceInfo.TYPE_WIRED_HEADSET,
      AudioDeviceInfo.TYPE_USB_HEADSET,
      AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
      AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
    )
  }
}
