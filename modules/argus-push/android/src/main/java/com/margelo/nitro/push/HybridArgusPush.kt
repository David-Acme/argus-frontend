package com.margelo.nitro.push

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.davidacme.argus.push.CallSession
import com.davidacme.argus.push.PushKeys
import com.davidacme.argus.push.PushNotifier
import com.davidacme.argus.push.PushStore
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.gms.tasks.Tasks
import com.google.firebase.messaging.FirebaseMessaging
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.concurrent.ExecutionException

@DoNotStrip
class HybridArgusPush : HybridArgusPushSpec() {
  override fun ensureKey(): Promise<Unit> = Promise.async {
    PushKeys(requireContext()).ensure()
  }

  override fun publicKey(): Promise<String> = Promise.async {
    val raw = PushKeys(requireContext()).publicKey()
    android.util.Base64.encodeToString(raw, PushKeys.BASE64URL)
  }

  override fun keyId(): Promise<String> = Promise.async {
    PushKeys(requireContext()).keyId()
  }

  override fun pushToken(): Promise<String> = Promise.async {
    val messaging = firebaseMessaging()
    try {
      Tasks.await(messaging.token)
    } catch (error: ExecutionException) {
      throw IllegalStateException("PUSH_UNAVAILABLE|${error.message ?: "token unavailable"}")
    }
  }

  override fun storedPushToken(): String = PushStore(requireContext()).storedToken()

  override fun deleteFcmToken(): Promise<Unit> = Promise.async {
    val messaging = firebaseMessaging()
    try {
      Tasks.await(messaging.deleteToken())
    } catch (error: ExecutionException) {
      throw IllegalStateException("PUSH_UNAVAILABLE|${error.message ?: "token deletion failed"}")
    }
    Unit
  }

  override fun wipe(): Promise<Unit> = Promise.async {
    val context = requireContext()
    PushKeys(context).wipe()
    PushStore(context).clearDurable()
    Unit
  }

  override fun takeDeclines(): Array<String> = PushStore(requireContext()).takeDeclines().toTypedArray()

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

  override fun fullScreenExplanationShown(): Boolean = PushStore(requireContext()).fullScreenExplanationShown()

  override fun markFullScreenExplanationShown() {
    PushStore(requireContext()).markFullScreenExplanationShown()
  }

  override fun endActiveCall() {
    CallSession.endActive(requireContext())
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
