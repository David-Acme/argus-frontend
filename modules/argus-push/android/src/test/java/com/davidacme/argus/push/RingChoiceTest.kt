package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Test

class RingChoiceTest {
    @Test
    fun aReminderOffersEnDiezMinutosBetweenDeclineAndAnswerOnlyWhenItCanBeSnoozed() {
        assertEquals(listOf(RingChoice.Decline, RingChoice.Snooze, RingChoice.Answer), ringChoices(critical = false, snoozable = true))
        assertEquals(listOf(RingChoice.Decline, RingChoice.Answer), ringChoices(critical = false, snoozable = false))
    }

    @Test
    fun anAlertNeverOffersASnooze() {
        assertEquals(listOf(RingChoice.Decline, RingChoice.Answer), ringChoices(critical = true, snoozable = true))
    }
}
