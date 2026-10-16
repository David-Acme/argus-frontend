package com.davidacme.argus.push

import android.Manifest
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Person
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.graphics.drawable.Icon
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper

internal data class OngoingCallState(
    val callId: String,
    val outside: Boolean,
    val assistant: Boolean,
    val startedAtMillis: Long,
)

internal class OngoingCallService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private val captureProbe = object : Runnable {
        override fun run() {
            probeCapture()
            handler.postDelayed(this, CAPTURE_PROBE_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        PushChannels.ensure(this)
    }

    override fun onDestroy() {
        handler.removeCallbacks(captureProbe)
        current = null
        running = null
        super.onDestroy()
    }

    private fun probeCapture() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
        val configs = getSystemService(AudioManager::class.java)?.activeRecordingConfigurations ?: return
        val silenced = configs.any { it.isClientSilenced }
        NativeTrace.record("voice", "probe", "silenced-${if (silenced) 1 else 0}-configs-${configs.size}")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val callId = intent?.getStringExtra(EXTRA_CALL_ID)
        if (intent?.action != ACTION_START || callId.isNullOrEmpty()) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        val outside = intent.getBooleanExtra(EXTRA_OUTSIDE, false)
        val assistant = intent.getBooleanExtra(EXTRA_ASSISTANT, false)
        PushChannels.ensure(this)
        val previous = current?.takeIf { it.callId == callId }
        val state = previous ?: OngoingCallState(callId, outside, assistant, System.currentTimeMillis())
        current = state
        running = java.lang.ref.WeakReference(this)
        startOngoing(build(this, state))
        NativeTrace.record("ongoing", "shown", if (previous != null) "repromoted" else if (outside) "outside" else "inside")
        if (BackgroundAccess.restricted(this)) NativeTrace.record("ongoing", "restricted", "background-battery")
        handler.removeCallbacks(captureProbe)
        handler.post(captureProbe)
        return START_NOT_STICKY
    }

    private fun startOngoing(notification: Notification) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(ID, notification)
            NativeTrace.record("ongoing", "fallback", "fgs-untyped")
            return
        }
        val types = ongoingServiceTypes(microphoneGranted(this))
        try {
            startForeground(ID, notification, types)
            NativeTrace.record("ongoing", "shown", if ((types and MICROPHONE_TYPE) != 0) "fgs-phone-call-microphone" else "fgs-phone-call")
        } catch (refused: SecurityException) {
            try {
                startForeground(ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL)
                NativeTrace.record("ongoing", "fallback", "fgs-phone-call")
            } catch (denied: SecurityException) {
                NativeTrace.record("ongoing", "error", "fgs-refused")
                stopSelf()
            }
        }
    }

    companion object {
        const val CAPTURE_PROBE_MS = 5_000L
        const val ACTION_START = "com.davidacme.argus.push.ONGOING_START"
        const val EXTRA_CALL_ID = "com.davidacme.argus.push.ONGOING_CALL_ID"
        const val EXTRA_OUTSIDE = "com.davidacme.argus.push.ONGOING_OUTSIDE"
        const val EXTRA_ASSISTANT = "com.davidacme.argus.push.ONGOING_ASSISTANT"
        const val ID = 7046
        const val ACCENT = 0xFF023C69.toInt()
        private const val EXTRA_REQUEST_PROMOTED_ONGOING = "android.requestPromotedOngoing"
        private const val FLAGS = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE

        @Volatile
        private var current: OngoingCallState? = null

        @Volatile
        private var running: java.lang.ref.WeakReference<OngoingCallService>? = null

        fun intent(context: Context, callId: String, outside: Boolean, assistant: Boolean): Intent =
            Intent(context, OngoingCallService::class.java)
                .setAction(ACTION_START)
                .putExtra(EXTRA_CALL_ID, callId)
                .putExtra(EXTRA_OUTSIDE, outside)
                .putExtra(EXTRA_ASSISTANT, assistant)

        fun demoted(context: Context): OngoingCallState? {
            val state = current ?: return null
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return state
            val service = running?.get() ?: return state
            return state.takeIf { needsPromotion(service.foregroundServiceType, microphoneGranted(context)) }
        }

        fun microphoneGranted(context: Context): Boolean =
            context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED

        fun refresh(context: Context) {
            val state = current ?: return
            context.getSystemService(NotificationManager::class.java)?.notify(ID, build(context, state))
        }

        private fun build(context: Context, state: OngoingCallState): Notification {
            val copy = ongoingCallCopy(PushText.isSpanish())
            val controls = CallControls.snapshot()
            val open = PendingIntent.getActivity(
                context,
                0,
                PushActions.launchIntent(context, ongoingDeepLink(state)).apply {
                    if (state.outside) putExtra(KeyguardCall.EXTRA_SHOW_OVER_LOCK, true)
                },
                FLAGS,
            )
            val icon = Icon.createWithResource(context, context.applicationInfo.icon)
            val hangUp = broadcast(context, 1, PushActions.ACTION_HANG_UP, state.callId)
            val mute = Notification.Action.Builder(
                icon,
                if (controls.muted) copy.unmute else copy.mute,
                broadcast(context, 2, PushActions.ACTION_MUTE, state.callId),
            ).build()
            val speaker = Notification.Action.Builder(
                icon,
                if (controls.speakerOn) copy.earpiece else copy.speaker,
                broadcast(context, 3, PushActions.ACTION_SPEAKER, state.callId),
            ).build()
            val builder = Notification.Builder(context, ongoingCallChannel())
                .setSmallIcon(context.applicationInfo.icon)
                .setColor(ACCENT)
                .setContentTitle(copy.title)
                .setContentIntent(open)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_CALL)
                .setWhen(state.startedAtMillis)
                .setShowWhen(true)
                .setUsesChronometer(true)
            builder.extras.putBoolean(EXTRA_REQUEST_PROMOTED_ONGOING, true)
            if (ongoingCallStyleOf(Build.VERSION.SDK_INT, CallSession.telecomActive()) == OngoingCallStyle.Call) {
                val person = Person.Builder().setName("Argus").setIcon(icon).setImportant(true).build()
                builder.setFullScreenIntent(open, false)
                    .setStyle(Notification.CallStyle.forOngoingCall(person, hangUp))
                    .addAction(mute)
                    .addAction(speaker)
                NativeTrace.record("ongoing", "shown", "call-style")
            } else {
                builder.addAction(Notification.Action.Builder(icon, copy.hangUp, hangUp).build())
                    .addAction(mute)
                    .addAction(speaker)
                NativeTrace.record("ongoing", "shown", "plain-style")
            }
            return builder.build()
        }

        private fun broadcast(context: Context, requestCode: Int, action: String, callId: String): PendingIntent =
            PendingIntent.getBroadcast(
                context,
                requestCode,
                Intent(context, PushActionReceiver::class.java)
                    .setAction(action)
                    .putExtra(PushActions.EXTRA_CALL_ID, callId),
                FLAGS,
            )
    }
}

internal const val MICROPHONE_TYPE = ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE

internal fun ongoingServiceTypes(microphoneGranted: Boolean): Int =
    ServiceInfo.FOREGROUND_SERVICE_TYPE_PHONE_CALL or (if (microphoneGranted) MICROPHONE_TYPE else 0)

internal fun needsPromotion(currentTypes: Int, microphoneGranted: Boolean): Boolean =
    currentTypes == 0 || (microphoneGranted && (currentTypes and MICROPHONE_TYPE) == 0)
