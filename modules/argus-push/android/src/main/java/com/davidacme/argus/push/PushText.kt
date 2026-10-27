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

    fun incomingTitle(spanish: Boolean): String = if (spanish) "Argus te llama" else "Argus is calling"

    fun criticalTitle(spanish: Boolean): String = if (spanish) "Alerta en casa" else "Alert at home"

    fun stageLine(spanish: Boolean, critical: Boolean, subject: String): String {
        val kicker = when {
            critical && spanish -> "Alerta en casa"
            critical -> "Alert at home"
            spanish -> "Llamada de Argus"
            else -> "Argus call"
        }
        val trimmed = subject.trim()
        return if (trimmed.isEmpty()) kicker else "$kicker · $trimmed"
    }

    fun privateLine(spanish: Boolean): String = if (spanish) "Privada · se queda en tu casa" else "Private · stays in your home"

    fun answer(spanish: Boolean): String = if (spanish) "Contestar" else "Answer"

    fun decline(spanish: Boolean): String = if (spanish) "Rechazar" else "Decline"

    fun snooze(spanish: Boolean): String = if (spanish) "En 10 min" else "In 10 min"

    fun callBack(spanish: Boolean): String = if (spanish) "Devolver" else "Call back"

    fun markDone(spanish: Boolean): String = if (spanish) "Marcar hecho" else "Mark done"

    fun callActionLine(outcome: CallActionOutcome, spanish: Boolean): String =
        when (outcome) {
            CallActionOutcome.Snoozed -> if (spanish) "Te llamo de nuevo en 10 min" else "I'll call you again in 10 min"
            CallActionOutcome.Done -> if (spanish) "Marcado como hecho" else "Marked as done"
            CallActionOutcome.Denied -> if (spanish) "Esta acción no vale en este teléfono" else "This action isn't valid on this phone"
            CallActionOutcome.Used -> if (spanish) "Ese recordatorio ya estaba resuelto" else "That reminder was already handled"
            CallActionOutcome.Expired -> if (spanish) "Ya pasó el tiempo para esta acción" else "This action has expired"
            CallActionOutcome.Gone -> if (spanish) "Ese recordatorio ya no existe" else "That reminder no longer exists"
            CallActionOutcome.Unavailable -> if (spanish) "Argus no pudo cambiarlo ahora. Prueba otra vez." else "Argus couldn't change it now. Try again."
            CallActionOutcome.Unreached -> if (spanish) "No llegué a Argus. Prueba otra vez." else "Couldn't reach Argus. Try again."
        }

    fun channelName(channelId: String, spanish: Boolean): String =
        when (channelId) {
            PushChannels.CRITICAL -> if (spanish) "Avisos críticos" else "Critical alerts"
            PushChannels.TIME_SENSITIVE -> if (spanish) "Avisos importantes" else "Time-sensitive alerts"
            PushChannels.NORMAL -> if (spanish) "Avisos" else "Alerts"
            PushChannels.SILENT_ALERTS -> if (spanish) "Avisos con el timbre" else "Alerts with the ring"
            PushChannels.ONGOING -> if (spanish) "Llamada en curso" else "Call in progress"
            PushChannels.SUMMARY -> if (spanish) "Resumen de llamadas" else "Call summaries"
            else -> if (spanish) "Llamadas" else "Calls"
        }
}
