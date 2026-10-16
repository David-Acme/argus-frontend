package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Test

class AlertSurfaceTest {
    @Test
    fun aForegroundAlertWithItsBannerBoundShowsInAppAndSkipsTheSystemPost() {
        assertEquals(AlertRoute(postSystemAlert = false, inAppBanner = true, alarm = false), AlertSurface.route(true, true, false))
    }

    @Test
    fun aForegroundCriticalAlertAlsoSoundsTheAlarm() {
        assertEquals(AlertRoute(postSystemAlert = false, inAppBanner = true, alarm = true), AlertSurface.route(true, true, true))
    }

    @Test
    fun aVisibleOrBackgroundAlertPostsTheSystemAlertWhateverItsUrgency() {
        for (critical in listOf(false, true)) {
            assertEquals(AlertRoute(postSystemAlert = true, inAppBanner = false, alarm = false), AlertSurface.route(false, true, critical))
        }
    }

    @Test
    fun aForegroundAlertWithNoBannerListenerFallsBackToTheSystemPost() {
        for (critical in listOf(false, true)) {
            assertEquals(AlertRoute(postSystemAlert = true, inAppBanner = false, alarm = false), AlertSurface.route(true, false, critical))
        }
    }
}
