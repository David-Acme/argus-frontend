package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class CallActionTest {
    private val token = "0123456789abcdef".repeat(4)

    private fun ring(extra: String = """"category":"reminder","reminderId":77,"actionToken":"$token","actionExpiresAt":1791001860"""): PushIntent? =
        PushIntent.parse(
            """{"intentId":"intent-0101","kind":"call","callId":"call-9","urgency":"time_sensitive","episode":"agenda:reminder:77","exp":1791000060,$extra}""",
        )

    private fun grant(callId: String, episode: String, expiresAt: Long = 2_000L) =
        CallActionGrant(callId = callId, episode = episode, reminderId = 77L, token = token, expiresAtSeconds = expiresAt)

    @Test
    fun aReminderRingThatNamesItsReminderCarriesAGrant() {
        val grant = ring()?.let(CallActionRules::grantOf)
        assertEquals(CallActionGrant("call-9", "agenda:reminder:77", 77L, token, 1791001860L), grant)
    }

    @Test
    fun noGrantForAnAlertANoticeACancelOrABadToken() {
        assertNull(ring(""""category":"alert","reminderId":77,"actionToken":"$token","actionExpiresAt":1791001860""")?.let(CallActionRules::grantOf))
        assertNull(ring(""""category":"notice","actionToken":"$token","actionExpiresAt":1791001860""")?.let(CallActionRules::grantOf))
        assertNull(ring(""""category":"reminder","reminderId":77""")?.let(CallActionRules::grantOf))
        assertNull(ring(""""category":"reminder","actionToken":"$token","actionExpiresAt":1791001860""")?.let(CallActionRules::grantOf))
        assertNull(ring(""""category":"reminder","reminderId":77,"actionToken":"${token.uppercase()}","actionExpiresAt":1791001860""")?.let(CallActionRules::grantOf))
        val critical = ring()?.copy(urgency = "critical")
        assertNull(critical?.let(CallActionRules::grantOf))
        assertNull(ring()?.copy(cancel = true)?.let(CallActionRules::grantOf))
    }

    @Test
    fun theTaskSendsOnlyTheCallTheTokenAndTheAction() {
        val arguments = CallActionRules.taskArguments(grant("call-9", "agenda:reminder:77"), CallActionKind.Snooze)
        assertEquals(mapOf("callId" to "call-9", "token" to token, "action" to "snooze"), arguments)
        assertEquals("done", CallActionRules.taskArguments(grant("call-9", ""), CallActionKind.Done)["action"])
        assertEquals(CallActionKind.Done, CallActionKind.of("done"))
        assertNull(CallActionKind.of("later"))
    }

    @Test
    fun eachAnswerMapsToItsOwnLineAndOnlyAnUnavailableOrUnreachedServerKeepsTheButton() {
        assertEquals(CallActionOutcome.Snoozed, CallActionRules.outcomeOf(CallActionKind.Snooze, 200))
        assertEquals(CallActionOutcome.Done, CallActionRules.outcomeOf(CallActionKind.Done, 200))
        assertEquals(CallActionOutcome.Denied, CallActionRules.outcomeOf(CallActionKind.Done, 403))
        assertEquals(CallActionOutcome.Used, CallActionRules.outcomeOf(CallActionKind.Done, 409))
        assertEquals(CallActionOutcome.Expired, CallActionRules.outcomeOf(CallActionKind.Done, 410))
        assertEquals(CallActionOutcome.Gone, CallActionRules.outcomeOf(CallActionKind.Done, 404))
        assertEquals(CallActionOutcome.Unavailable, CallActionRules.outcomeOf(CallActionKind.Done, 503))
        assertEquals(CallActionOutcome.Unreached, CallActionRules.outcomeOf(CallActionKind.Done, 0))
        val retried = CallActionOutcome.entries.filter(CallActionRules::retries)
        assertEquals(listOf(CallActionOutcome.Unavailable, CallActionOutcome.Unreached), retried)
        assertTrue(CallActionRules.succeeded(CallActionOutcome.Snoozed))
        assertFalse(CallActionRules.succeeded(CallActionOutcome.Used))
    }

    @Test
    fun everyOutcomeHasAShortLineInBothLanguages() {
        CallActionOutcome.entries.forEach { outcome ->
            assertTrue(PushText.callActionLine(outcome, spanish = true).length in 1..60)
            assertTrue(PushText.callActionLine(outcome, spanish = false).length in 1..60)
        }
        assertEquals("Te llamo de nuevo en 10 min", PushText.callActionLine(CallActionOutcome.Snoozed, spanish = true))
        assertEquals("Marcar hecho", PushText.markDone(spanish = true))
    }

    @Test
    fun aMissedReminderCallOffersMarcarHechoBeforeDevolverAndAnAlertOnlyDevolver() {
        assertEquals(listOf(MissedCallAction.MarkDone, MissedCallAction.CallBack), missedCallActions(critical = false, reminderLinked = true))
        assertEquals(listOf(MissedCallAction.CallBack), missedCallActions(critical = false, reminderLinked = false))
        assertEquals(listOf(MissedCallAction.CallBack), missedCallActions(critical = true, reminderLinked = true))
    }

    @Test
    fun grantsAreFoundByCallAndByEpisodeUntilTheyExpire() {
        val grants = listOf(grant("call-1", "agenda:reminder:5", 900L), grant("call-2", "agenda:reminder:6"))
        assertEquals("call-2", CallActionRules.forEpisode(grants, "agenda:reminder:6", 1_000L)?.callId)
        assertNull(CallActionRules.forEpisode(grants, "agenda:reminder:5", 1_000L))
        assertNull(CallActionRules.forEpisode(grants, "", 1_000L))
        assertEquals("call-1", CallActionRules.forCall(grants, "call-1", 800L)?.callId)
        assertNull(CallActionRules.forCall(grants, "call-1", 900L))
    }

    @Test
    fun aNewRingReplacesTheGrantOfTheSameEpisodeAndExpiredGrantsAreDropped() {
        val kept = CallActionRules.withGrant(
            listOf(grant("call-1", "agenda:reminder:5"), grant("call-0", "agenda:reminder:4", 10L)),
            grant("call-3", "agenda:reminder:5"),
            nowSeconds = 100L,
        )
        assertEquals(listOf("call-3"), kept.map { it.callId })
        val many = (1..12).fold(emptyList<CallActionGrant>()) { list, index -> CallActionRules.withGrant(list, grant("call-$index", ""), 100L) }
        assertEquals((5..12).map { "call-$it" }, many.map { it.callId })
    }

    @Test
    fun theStoredGrantsRoundTripAndAnUnreadableStoreIsEmpty() {
        val grants = listOf(grant("call-1", "agenda:reminder:5").copy(missedTag = "intent-9"), grant("call-2", ""))
        assertEquals(grants, CallActionRules.decode(CallActionRules.encode(grants)))
        assertEquals(emptyList<CallActionGrant>(), CallActionRules.decode("not json"))
    }
}
