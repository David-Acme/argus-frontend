package com.davidacme.argus.push

import java.util.Locale

internal object PushText {
    const val TITLE = "Argus"

    fun ringTitle(subject: String): String = subject.trim().ifEmpty { TITLE }

    fun isSpanish(): Boolean = Locale.getDefault().language == "es"

    fun generic(spanish: Boolean, urgent: Boolean): String =
        when {
            spanish && urgent -> "Tienes un aviso importante. Abre Argus para verlo."
            spanish -> "Tienes un aviso nuevo. Abre Argus para verlo."
            urgent -> "You have an important notice. Open Argus to see it."
            else -> "You have a new notice. Open Argus to see it."
        }

    fun missedCallTitle(spanish: Boolean): String = if (spanish) "Llamada perdida" else "Missed call"

    fun missedCallBody(spanish: Boolean): String = if (spanish) "Toca para ver quién llamó" else "Tap to see who called"

    fun callTitle(spanish: Boolean): String = if (spanish) "Llamada de Argus" else "Argus is calling"

    fun incomingTitle(spanish: Boolean): String = if (spanish) "Argus te llama" else "Argus is calling"

    fun criticalTitle(spanish: Boolean): String = if (spanish) "Alerta crítica" else "Critical alert"

    fun ringStatus(spanish: Boolean, time: String): String =
        if (spanish) "Llamada de Argus · sonando · $time" else "Argus call · ringing · $time"

    fun clock(elapsedMillis: Long): String {
        val totalSeconds = maxOf(0L, elapsedMillis / 1000L)
        return "%02d:%02d".format(totalSeconds / 60L, totalSeconds % 60L)
    }

    fun answer(spanish: Boolean): String = if (spanish) "Contestar" else "Answer"

    fun decline(spanish: Boolean): String = if (spanish) "Rechazar" else "Decline"

    fun channelName(channelId: String, spanish: Boolean): String =
        when (channelId) {
            PushChannels.CRITICAL -> if (spanish) "Avisos críticos" else "Critical alerts"
            PushChannels.TIME_SENSITIVE -> if (spanish) "Avisos importantes" else "Time-sensitive alerts"
            PushChannels.NORMAL -> if (spanish) "Avisos" else "Alerts"
            PushChannels.SILENT_ALERTS -> if (spanish) "Avisos con el timbre" else "Alerts with the ring"
            PushChannels.ONGOING -> if (spanish) "Llamada en curso" else "Call in progress"
            else -> if (spanish) "Llamadas" else "Calls"
        }
}
