package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DedupRulesTest {
    private val now = 1_791_000_000L

    @Test
    fun aCancelIsHonouredEvenPastTheCallsOwnExpiry() {
        assertFalse(DedupRules.dropsIntent(PushIntent.KIND_CALL, true, now - 1L, now))
    }

    @Test
    fun aRingPastItsExpiryIsDropped() {
        assertTrue(DedupRules.dropsIntent(PushIntent.KIND_CALL, false, now - 1L, now))
    }

    @Test
    fun anAlertPastItsExpiryIsDropped() {
        assertTrue(DedupRules.dropsIntent(PushIntent.KIND_ALERT, false, now - 1L, now))
    }

    @Test
    fun aFreshCancelIsRouted() {
        assertFalse(DedupRules.dropsIntent(PushIntent.KIND_CALL, true, now + 60L, now))
    }

    @Test
    fun seenWithinTheWindow() {
        val seen = mapOf("intent:a" to now - 60L)
        assertTrue(DedupRules.isSeen(seen, "intent:a", now))
        assertFalse(DedupRules.isSeen(seen, "intent:b", now))
    }

    @Test
    fun notSeenAfterTheWindow() {
        val seen = mapOf("intent:a" to now - DedupRules.WINDOW_SECONDS)
        assertFalse(DedupRules.isSeen(seen, "intent:a", now))
    }

    @Test
    fun pruneDropsOnlyOldEntries() {
        val seen = mapOf("old" to now - DedupRules.WINDOW_SECONDS - 1L, "fresh" to now - 1L)
        assertEquals(mapOf("fresh" to now - 1L), DedupRules.prune(seen, now))
    }

    @Test
    fun expiryIsInclusive() {
        assertTrue(DedupRules.isExpired(now, now))
        assertFalse(DedupRules.isExpired(now + 1L, now))
    }
}
