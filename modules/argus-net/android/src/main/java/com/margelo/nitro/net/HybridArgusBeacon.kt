package com.margelo.nitro.net

import android.bluetooth.BluetoothManager
import android.content.Intent
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

@DoNotStrip
class HybridArgusBeacon : HybridArgusBeaconSpec() {

  override fun supported(): Boolean {
    val context = NitroModules.applicationContext ?: return false
    val adapter = context.getSystemService(BluetoothManager::class.java)?.adapter ?: return false
    return adapter.isMultipleAdvertisementSupported
  }

  override fun permissionGranted(): Boolean {
    val context = NitroModules.applicationContext ?: return false
    return PresenceBeaconService.permitted(context)
  }

  override fun start(config: BeaconConfig): Promise<Boolean> {
    return Promise.async {
      val context = NitroModules.applicationContext ?: return@async false
      if (BeaconToken.seedBytes(config.seed) == null || !PresenceBeaconService.permitted(context) || !supported()) {
        return@async false
      }
      val intent = Intent(context, PresenceBeaconService::class.java)
        .setAction(PresenceBeaconService.ACTION_START)
        .putExtra(PresenceBeaconService.EXTRA_SEED, config.seed)
        .putExtra(PresenceBeaconService.EXTRA_ROTATE_SECONDS, config.rotateSeconds.toLong())
        .putExtra(PresenceBeaconService.EXTRA_TITLE, config.title)
        .putExtra(PresenceBeaconService.EXTRA_DETAIL, config.detail)
      try {
        context.startForegroundService(intent)
        true
      } catch (_: IllegalStateException) {
        false
      } catch (_: SecurityException) {
        false
      }
    }
  }

  override fun stop() {
    val context = NitroModules.applicationContext ?: return
    context.stopService(Intent(context, PresenceBeaconService::class.java))
  }

  override fun running(): Boolean = PresenceBeaconService.running
}
