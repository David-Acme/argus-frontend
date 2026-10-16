package com.davidacme.argus.push

internal data class AlertCopy(
    val title: String,
    val body: String,
    val publicTitle: String,
    val publicBody: String,
)

internal object PushVisibility {
    const val MISSED_CALL_TYPE = "call"

    fun alertCopy(type: String, title: String, body: String, spanish: Boolean, urgent: Boolean): AlertCopy =
        AlertCopy(
            title = title.ifEmpty { PushText.TITLE },
            body = body,
            publicTitle = if (type == MISSED_CALL_TYPE) PushText.missedCallTitle(spanish) else PushText.TITLE,
            publicBody = PushText.generic(spanish, urgent),
        )
}
