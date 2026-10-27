package com.margelo.nitro.push

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.davidacme.argus.push.BackgroundAccess
import com.davidacme.argus.push.BackgroundStep
import com.davidacme.argus.push.TelecomCall
import com.davidacme.argus.push.endpointsJson
import com.davidacme.argus.push.CallActions
import com.davidacme.argus.push.CallControls
import com.davidacme.argus.push.CallSummary
import com.davidacme.argus.push.CallSession
import com.davidacme.argus.push.KeyguardCall
import com.davidacme.argus.push.ExactAlarms
import com.davidacme.argus.push.PushActivityTracker
import com.davidacme.argus.push.NativeTrace
import com.davidacme.argus.push.PushAlertEvents
import com.davidacme.argus.push.PushTokenEvents
import com.davidacme.argus.push.PushKeys
import com.davidacme.argus.push.PushNotifier
import com.davidacme.argus.push.PushStore
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import com.google.firebase.messaging.FirebaseMessaging
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.NullType
import com.margelo.nitro.core.Promise
import java.util.concurrent.ExecutionException
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

@DoNotStrip
class HybridArgusPush : HybridArgusPushSpec() {
  override fun keys(): Promise<ArgusPushKeys> = Promise.async {
    val keys = PushKeys(requireContext())
    keys.ensure()
    ArgusPushKeys(
      publicKey = android.util.Base64.encodeToString(keys.publicKey(), PushKeys.BASE64URL),
      keyId = keys.keyId(),
    )
  }

  override fun storedToken(): Promise<Variant_NullType_String> = Promise.async {
    val context = requireContext()
    val stored = PushStore(context).storedToken()
    val token = if (stored.isNotEmpty()) stored else fetchToken(context)
    if (token == null) Variant_NullType_String.create(NullType.NULL) else Variant_NullType_String.create(token)
  }

  override fun deleteToken(): Promise<Unit> = Promise.async {
    val context = requireContext()
    try {
      awaitTask(firebaseMessaging().deleteToken())
    } finally {
      PushStore(context).clearToken()
    }
    Unit
  }

  override fun deleteKeys(): Promise<Unit> = Promise.async {
    PushKeys(requireContext()).delete()
    Unit
  }

  override fun setDeclineListener(listener: (callId: String) -> Unit) {
    CallSession.declineListener = listener
  }

  override fun setTokenListener(listener: (token: String) -> Unit) {
    PushTokenEvents.listener = listener
  }

  override fun setAlertListener(listener: (alertJson: String) -> Unit) {
    PushAlertEvents.listener = listener
  }

  override fun takeDeclines(): Array<String> = PushStore(requireContext()).takeDeclines().toTypedArray()

  override fun ackDecline(callId: String) {
    PushStore(requireContext()).removeDecline(callId)
  }

  override fun reportCallAction(callId: String, action: String, status: Double) {
    CallActions.report(requireContext(), callId, action, status.toInt())
  }

  override fun recordTrace(phase: String, outcome: String, reason: String) {
    NativeTrace.record(phase, outcome, reason)
  }

  override fun exactAlarmsAllowed(): Boolean = ExactAlarms.allowed(requireContext())

  override fun openExactAlarmSettings() {
    ExactAlarms.openSettings(requireContext())
  }

  override fun sendToBackground() {
    PushActivityTracker.moveToBackground()
  }

  override fun isKeyguardLocked(): Boolean = KeyguardCall.isKeyguardLocked(requireContext())

  override fun overKeyguard(): Boolean = KeyguardCall.isShown()

  override fun requestUnlock(): Promise<Boolean> {
    val promise = Promise<Boolean>()
    KeyguardCall.requestUnlock(requireContext()) { unlocked -> promise.resolve(unlocked) }
    return promise
  }

  override fun postCallSummary(title: String, body: String) {
    PushNotifier.postCallSummary(requireContext(), CallSummary(title, body))
  }

  override fun outsideCallId(): String = KeyguardCall.outsideCallId().orEmpty()

  override fun endActiveCall() {
    CallSession.endActive(requireContext())
  }

  override fun setCallControlListener(listener: (action: String) -> Unit) {
    CallControls.listener = listener
  }

  override fun telecomCallActive(): Boolean = CallSession.telecomActive()

  override fun backgroundAllowed(): Boolean = BackgroundAccess.step(requireContext()) == BackgroundStep.Granted

  override fun requestBackground() {
    BackgroundAccess.request(requireContext())
  }

  override fun callEndpoints(): String = endpointsJson(TelecomCall.endpointChoices())

  override fun selectCallEndpoint(id: String) {
    TelecomCall.select(id)
  }

  override fun startAssistantCall(): Promise<Boolean> {
    val promise = Promise<Boolean>()
    CallSession.startAssistant(requireContext()) { active -> promise.resolve(active) }
    return promise
  }

  override fun setCallMuted(muted: Boolean) {
    CallControls.mutedByApp(requireContext(), muted)
  }

  override fun stopOngoingCall() {
    CallSession.endAnswered(requireContext())
  }

  override fun canUseFullScreenIntent(): Boolean = PushNotifier.canUseFullScreen(requireContext())

  override fun openFullScreenSettings() {
    val context = requireContext()
    val uri = Uri.parse("package:${context.packageName}")
    val action = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT
    } else {
      Settings.ACTION_APPLICATION_DETAILS_SETTINGS
    }
    context.startActivity(Intent(action, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
  }

  override fun fullScreenExplained(): Boolean = PushStore(requireContext()).fullScreenExplained()

  override fun setFullScreenExplained(value: Boolean) {
    PushStore(requireContext()).setFullScreenExplained(value)
  }

  private fun fetchToken(context: Context): String? {
    val token = try {
      Tasks.await(firebaseMessaging().token, FETCH_TIMEOUT_SECONDS, TimeUnit.SECONDS)
    } catch (error: IllegalStateException) {
      return null
    } catch (error: ExecutionException) {
      return null
    } catch (error: TimeoutException) {
      return null
    }
    PushStore(context).saveToken(token)
    return token
  }

  private fun <T> awaitTask(task: Task<T>): T =
    try {
      Tasks.await(task)
    } catch (error: ExecutionException) {
      throw IllegalStateException("PUSH_UNAVAILABLE|${error.message ?: "the Firebase task failed"}")
    }

  private fun requireContext(): Context =
    NitroModules.applicationContext ?: throw IllegalStateException("PUSH_UNAVAILABLE|application context is not ready")

  private fun firebaseMessaging(): FirebaseMessaging =
    try {
      FirebaseMessaging.getInstance()
    } catch (error: IllegalStateException) {
      throw IllegalStateException("PUSH_DISABLED|Push is not configured in this build")
    }
}

private const val FETCH_TIMEOUT_SECONDS = 10L
