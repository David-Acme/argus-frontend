package com.davidacme.argus.push

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class ArgusMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        PushStore(this).saveToken(token)
        PushTokenEvents.rotated(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        PushRouter(this).route(message.data)
    }
}
