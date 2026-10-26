package com.davidacme.argus.push

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.telecom.DisconnectCause

internal object CallSession {
    private const val MILLIS = 1000L
    private const val APP_HANGUP_GRACE_MS = 4_000L

    private val handler = Handler(Looper.getMainLooper())
    private val ringer = CallRinger()
    private val lock = Any()
    private var active: ActiveCall? = null
    private var answeredCallId: String? = null
    private val endWatchers = mutableMapOf<String, () -> Unit>()

    @Volatile
    var declineListener: ((String) -> Unit)? = null

    fun isRingingFor(episode: String): Boolean =
        episode.isNotEmpty() && synchronized(lock) { active?.info?.episode == episode }

    fun activeEpisode(): String? = synchronized(lock) { active?.info?.episode?.takeIf { it.isNotEmpty() } }

    private class ActiveCall(val info: RingInfo, val expiry: Runnable) {
        val callId: String get() = info.callId
    }

    fun ringDisplay(callId: String): RingDisplay? =
        synchronized(lock) {
            active?.takeIf { it.callId == callId }?.let { RingDisplay(it.info.subject, it.info.critical) }
        }

    fun ring(context: Context, info: RingInfo) {
        val app = context.applicationContext
        val callId = info.callId
        val timeoutMillis = info.expiresAtSeconds * MILLIS - System.currentTimeMillis()
        if (timeoutMillis <= 0L) return
        val replaced = synchronized(lock) {
            if (active?.callId == callId) return
            val previous = active
            previous?.let { handler.removeCallbacks(it.expiry) }
            val expiry = Runnable { expire(app, callId) }
            active = ActiveCall(info, expiry)
            handler.postDelayed(expiry, timeoutMillis)
            previous?.callId
        }
        replaced?.let { releaseCall(app, it) }
        if (info.episode.isNotEmpty()) {
            PushStore(app).markRingStarted(info.episode, System.currentTimeMillis() / MILLIS)
            RealarmScheduler.cancel(app, info.episode)
        }
        ringer.start(app)
        TelecomCall.addIncoming(app, callId)
        PushNotifier.postCall(app, info, PushNotifier.canUseFullScreen(app), timeoutMillis)
    }

    fun isRinging(callId: String): Boolean = synchronized(lock) { active?.callId == callId }

    fun watchEnd(callId: String, onEnd: () -> Unit): () -> Unit {
        synchronized(lock) { endWatchers[callId] = onEnd }
        return {
            synchronized(lock) {
                if (endWatchers[callId] === onEnd) endWatchers.remove(callId)
            }
        }
    }

    fun telecomActive(): Boolean = TelecomCall.isActive()

    fun inCall(): Boolean = synchronized(lock) { answeredCallId != null || active != null }

    fun routeAudio(speaker: Boolean) {
        TelecomCall.route(speaker)
    }

    fun answer(context: Context, callId: String) {
        val app = context.applicationContext
        val first = synchronized(lock) {
            (answeredCallId != callId).also { if (it) answeredCallId = callId }
        }
        if (!first) return
        releaseCall(app, callId, answered = true)
        val fromOutside = !PushActivityTracker.appInForeground()
        PushActions.openCall(app, callId, enteredFromOutside = fromOutside)
        TelecomCall.answer(callId) { OngoingCall.show(app, callId, enteredFromOutside = fromOutside) }
    }

    fun startAssistant(context: Context, ready: (Boolean) -> Unit) {
        val app = context.applicationContext
        val existing = synchronized(lock) { answeredCallId != null || active != null }
        if (existing) {
            ready(TelecomCall.isActive())
            return
        }
        val callId = "assistant-${System.currentTimeMillis()}"
        val delivered = java.util.concurrent.atomic.AtomicBoolean(false)
        synchronized(lock) { answeredCallId = callId }
        TelecomCall.addOutgoing(app, callId) { active ->
            if (!delivered.compareAndSet(false, true)) return@addOutgoing
            val current = synchronized(lock) { answeredCallId == callId }
            if (current) OngoingCall.show(app, callId, enteredFromOutside = false, assistant = true)
            ready(active && current)
        }
    }

    fun decline(context: Context, callId: String) {
        val app = context.applicationContext
        releaseCall(app, callId)
        TelecomCall.end(DisconnectCause.REJECTED)
        deliverDecline(app, callId)
    }

    fun cancel(context: Context, callId: String) {
        val app = context.applicationContext
        releaseCall(app, callId)
        if (answeredCallMatches(synchronized(lock) { answeredCallId }, callId)) return
        TelecomCall.end(DisconnectCause.OTHER)
        CallFinish.finish(app, callId)
        CallAudio.restore(app)
    }

    fun endActive(context: Context) {
        val app = context.applicationContext
        val answered = synchronized(lock) {
            answeredCallId.takeIf { hangupHandledByApp(it, ringing = active != null, CallControls.listener != null) }
        }
        CallControls.hangUp()
        if (answered == null) {
            finishActive(app)
            return
        }
        NativeTrace.record("telecom", "queued", "hangup-by-app")
        handler.postDelayed({
            if (synchronized(lock) { answeredCallId == answered }) finishActive(app)
        }, APP_HANGUP_GRACE_MS)
    }

    private fun finishActive(app: Context) {
        val callId = synchronized(lock) { (active?.callId ?: answeredCallId).also { answeredCallId = null } }
        CallFinish.finish(app, callId)
        if (callId != null) releaseCall(app, callId)
        TelecomCall.end(DisconnectCause.LOCAL)
        CallAudio.restore(app)
    }

    fun endAnswered(context: Context) {
        val app = context.applicationContext
        val callId = synchronized(lock) { answeredCallId.also { answeredCallId = null } }
        CallFinish.finish(app, callId)
        if (callId == null) return
        TelecomCall.end(DisconnectCause.LOCAL)
        CallAudio.restore(app)
    }

    fun systemEnded(context: Context, callId: String) {
        val app = context.applicationContext
        CallControls.hangUp()
        synchronized(lock) { if (answeredCallId == callId) answeredCallId = null }
        releaseCall(app, callId)
        CallFinish.finish(app, callId)
        CallAudio.restore(app)
    }

    private fun deliverDecline(context: Context, callId: String) {
        val listener = declineListener
        when (declineRouteOf(listenerPresent = listener != null)) {
            DeclineRoute.Listener -> runCatching { listener?.invoke(callId) }.onFailure {
                PushLog.warn("the decline listener failed; the decline is kept for the next start")
                PushStore(context).addDecline(callId)
            }
            DeclineRoute.Headless -> {
                PushStore(context).addDecline(callId)
                NativeTrace.record("decline", "queued", "awaiting-task")
                if (!DeclineTask.start(context, callId)) NativeTrace.record("decline", "queued", "start-refused")
            }
        }
    }

    private fun expire(context: Context, callId: String) {
        if (!releaseCall(context, callId)) return
        TelecomCall.end(DisconnectCause.MISSED)
    }

    private fun releaseCall(context: Context, callId: String, answered: Boolean = false): Boolean {
        val (matched, watcher) = synchronized(lock) {
            val current = active
            val matched = if (current != null && current.callId == callId) {
                handler.removeCallbacks(current.expiry)
                active = null
                true
            } else {
                false
            }
            Pair(matched, endWatchers[callId])
        }
        val plan = CallEndPlan.forEnd(wasRinging = matched, answered = answered)
        if (plan.stopRinger) ringer.stop(context)
        PushNotifier.cancelCall(context, plan)
        PushLog.info("call $callId released: ringing=$matched screen=${watcher != null}")
        if (plan.finishScreen) watcher?.invoke()
        return matched
    }
}

internal fun hangupHandledByApp(answeredCallId: String?, ringing: Boolean, listenerPresent: Boolean): Boolean =
    answeredCallId != null && !ringing && listenerPresent

internal fun answeredCallMatches(answeredCallId: String?, callId: String): Boolean =
    answeredCallId != null && answeredCallId == callId
