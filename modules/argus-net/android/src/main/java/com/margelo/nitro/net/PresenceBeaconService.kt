package com.margelo.nitro.net

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.ParcelUuid

internal class PresenceBeaconService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var advertiser: BluetoothLeAdvertiser? = null
  private var seed: ByteArray? = null
  private var rotateSeconds: Long = DEFAULT_ROTATE_SECONDS
  private var advertising = false

  private val callback = object : AdvertiseCallback() {
    override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
      advertising = true
    }

    override fun onStartFailure(errorCode: Int) {
      advertising = false
    }
  }

  private val rotation = object : Runnable {
    override fun run() {
      advertise()
      handler.postDelayed(this, BeaconToken.millisToNextRotation(System.currentTimeMillis(), rotateSeconds))
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val decoded = intent?.getStringExtra(EXTRA_SEED)?.let(BeaconToken::seedBytes)
    if (intent?.action != ACTION_START || decoded == null || !permitted(this)) {
      shutdown()
      return START_NOT_STICKY
    }
    seed = decoded
    rotateSeconds = intent.getLongExtra(EXTRA_ROTATE_SECONDS, DEFAULT_ROTATE_SECONDS).coerceAtLeast(MIN_ROTATE_SECONDS)
    val title = intent.getStringExtra(EXTRA_TITLE).orEmpty()
    val detail = intent.getStringExtra(EXTRA_DETAIL).orEmpty()
    promote(notification(title, detail))
    running = true
    handler.removeCallbacks(rotation)
    handler.post(rotation)
    return START_REDELIVER_INTENT
  }

  override fun onDestroy() {
    handler.removeCallbacks(rotation)
    stopAdvertising()
    running = false
    super.onDestroy()
  }

  private fun shutdown() {
    handler.removeCallbacks(rotation)
    stopAdvertising()
    running = false
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  private fun promote(notification: Notification) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun advertise() {
    val key = seed ?: return
    val target = advertiser ?: getSystemService(BluetoothManager::class.java)?.adapter?.bluetoothLeAdvertiser
    if (target == null || !permitted(this)) {
      shutdown()
      return
    }
    advertiser = target
    stopAdvertising()
    val token = BeaconToken.uuid(key, BeaconToken.counter(System.currentTimeMillis() / 1000L, rotateSeconds))
    val settings = AdvertiseSettings.Builder()
      .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_POWER)
      .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_LOW)
      .setConnectable(false)
      .setTimeout(0)
      .build()
    val data = AdvertiseData.Builder()
      .setIncludeDeviceName(false)
      .setIncludeTxPowerLevel(false)
      .addServiceUuid(ParcelUuid(token))
      .build()
    try {
      target.startAdvertising(settings, data, callback)
    } catch (_: SecurityException) {
      shutdown()
    }
  }

  private fun stopAdvertising() {
    if (!advertising) return
    advertising = false
    try {
      advertiser?.stopAdvertising(callback)
    } catch (_: SecurityException) {
      advertiser = null
    }
  }

  private fun notification(title: String, detail: String): Notification {
    val manager = getSystemService(NotificationManager::class.java)
    if (manager?.getNotificationChannel(CHANNEL_ID) == null) {
      manager?.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, title.ifEmpty { CHANNEL_FALLBACK_NAME }, NotificationManager.IMPORTANCE_MIN).apply {
          setShowBadge(false)
        }
      )
    }
    val launch = packageManager.getLaunchIntentForPackage(packageName)
    val content = launch?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    return Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle(title)
      .setContentText(detail)
      .setOngoing(true)
      .setContentIntent(content)
      .setCategory(Notification.CATEGORY_SERVICE)
      .build()
  }

  companion object {
    const val ACTION_START = "com.margelo.nitro.net.beacon.START"
    const val EXTRA_SEED = "seed"
    const val EXTRA_ROTATE_SECONDS = "rotateSeconds"
    const val EXTRA_TITLE = "title"
    const val EXTRA_DETAIL = "detail"
    private const val CHANNEL_ID = "argus_presence_beacon"
    private const val CHANNEL_FALLBACK_NAME = "Argus"
    private const val NOTIFICATION_ID = 7330
    private const val DEFAULT_ROTATE_SECONDS = 900L
    private const val MIN_ROTATE_SECONDS = 60L

    @Volatile
    var running: Boolean = false
      private set

    fun permitted(context: Context): Boolean =
      Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
        context.checkSelfPermission(Manifest.permission.BLUETOOTH_ADVERTISE) == PackageManager.PERMISSION_GRANTED
  }
}
