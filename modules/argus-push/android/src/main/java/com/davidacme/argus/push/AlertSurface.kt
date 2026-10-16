package com.davidacme.argus.push

internal data class AlertRoute(
    val postSystemAlert: Boolean,
    val inAppBanner: Boolean,
    val alarm: Boolean,
)

internal object AlertSurface {
    fun route(foreground: Boolean, bannerBound: Boolean, critical: Boolean): AlertRoute {
        if (!foreground || !bannerBound) return AlertRoute(postSystemAlert = true, inAppBanner = false, alarm = false)
        return AlertRoute(postSystemAlert = false, inAppBanner = true, alarm = critical)
    }
}
