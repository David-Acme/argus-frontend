package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AlertSilenceTest {
    private val episode = "guard:panic:7"

    @Test
    fun alertThenRingStaysSilentUntilTheRingStarts() {
        val verdict = AlertSilence.decide(critical = true, ringFollows = true, activeRingEpisode = null, alertEpisode = episode)
        assertEquals(AlertVerdict.SilentUntilRingOrAlarm, verdict)
        assertFalse(AlertSilence.alarmDue(verdict, ringStarted = true, elapsedMs = 2_000L))
    }

    @Test
    fun ringThenAlertIsSilentForTheSameEpisode() {
        val verdict = AlertSilence.decide(critical = true, ringFollows = false, activeRingEpisode = episode, alertEpisode = episode)
        assertEquals(AlertVerdict.Silent, verdict)
    }

    @Test
    fun ringFollowsWithTheRingNeverArrivingAlarmsAtEightSeconds() {
        val verdict = AlertSilence.decide(critical = true, ringFollows = true, activeRingEpisode = null, alertEpisode = episode)
        assertFalse(AlertSilence.alarmDue(verdict, ringStarted = false, elapsedMs = 7_999L))
        assertTrue(AlertSilence.alarmDue(verdict, ringStarted = false, elapsedMs = AlertSilence.RING_GRACE_MS))
    }

    @Test
    fun aNonCriticalAlertAlwaysAlarms() {
        assertEquals(
            AlertVerdict.FullAlarm,
            AlertSilence.decide(critical = false, ringFollows = true, activeRingEpisode = episode, alertEpisode = episode),
        )
        assertEquals(
            AlertVerdict.FullAlarm,
            AlertSilence.decide(critical = false, ringFollows = false, activeRingEpisode = episode, alertEpisode = episode),
        )
    }

    @Test
    fun aRingForAnotherEpisodeDoesNotSilenceTheAlert() {
        assertEquals(
            AlertVerdict.FullAlarm,
            AlertSilence.decide(critical = true, ringFollows = false, activeRingEpisode = "guard:panic:8", alertEpisode = episode),
        )
        assertEquals(
            AlertVerdict.FullAlarm,
            AlertSilence.decide(critical = true, ringFollows = false, activeRingEpisode = null, alertEpisode = episode),
        )
    }

    @Test
    fun aCriticalAlertWithoutAnEpisodeAlarms() {
        assertEquals(
            AlertVerdict.FullAlarm,
            AlertSilence.decide(critical = true, ringFollows = false, activeRingEpisode = null, alertEpisode = null),
        )
        assertEquals(
            AlertVerdict.FullAlarm,
            AlertSilence.decide(critical = true, ringFollows = false, activeRingEpisode = episode, alertEpisode = null),
        )
    }
}
