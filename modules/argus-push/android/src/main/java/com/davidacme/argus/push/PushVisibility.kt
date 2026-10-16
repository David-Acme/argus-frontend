package com.davidacme.argus.push

internal data class AlertCopy(
    val title: String,
    val body: String,
    val publicTitle: String,
    val publicBody: String,
)

internal object PushVisibility {
    const val MISSED_CALL_TYPE = "call"

    fun alertCopy(type: String, title: String, body: String, spanish: Boolean, urgent: Boolean): AlertCopy {
        if (type == MISSED_CALL_TYPE) {
            val missed = PushText.missedCallTitle(spanish)
            val prompt = PushText.missedCallBody(spanish)
            return AlertCopy(title = missed, body = prompt, publicTitle = missed, publicBody = prompt)
        }
        return AlertCopy(
            title = title.ifEmpty { PushText.TITLE },
            body = body,
            publicTitle = PushText.TITLE,
            publicBody = PushText.generic(spanish, urgent),
        )
    }
}
