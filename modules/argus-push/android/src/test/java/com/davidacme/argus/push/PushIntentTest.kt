package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class PushIntentTest {
    @Test
    fun parsesAnAlertIntent() {
        val intent = PushIntent.parse(
            """{"intentId":"intent-0002","kind":"alert","urgency":"critical","notificationId":"42","title":"Argus","body":"Aviso","exp":1791000060,"iat":1791000000}""",
        )
        assertEquals("intent-0002", intent?.intentId)
        assertEquals(PushIntent.KIND_ALERT, intent?.kind)
        assertEquals("critical", intent?.urgency)
        assertEquals("42", intent?.notificationId)
        assertEquals(1791000060L, intent?.expiresAtSeconds)
        assertFalse(intent?.cancel ?: true)
    }

    @Test
    fun parsesACancelCallIntent() {
        val intent = PushIntent.parse(
            """{"intentId":"intent-0003","kind":"call","callId":"call-0001","cancel":true,"exp":1791000060}""",
        )
        assertEquals(PushIntent.KIND_CALL, intent?.kind)
        assertEquals("call-0001", intent?.callId)
        assertTrue(intent?.cancel ?: false)
    }

    @Test
    fun refusesAnIntentWithoutExpiry() {
        assertNull(PushIntent.parse("""{"intentId":"intent-0004","kind":"alert"}"""))
    }

    @Test
    fun refusesAnUnknownKind() {
        assertNull(PushIntent.parse("""{"intentId":"intent-0005","kind":"sms","exp":1791000060}"""))
    }

    @Test
    fun refusesMalformedJson() {
        assertNull(PushIntent.parse("{not json"))
    }
}
