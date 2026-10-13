package com.margelo.nitro.net

import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull

private const val HOME_ID_LENGTH = 32
private const val LABEL_MAX_LENGTH = 63
private const val DOMAIN_MAX_LENGTH = 253

enum class HostAdmission {
  Paired,
  Relay,
  Refused,
}

data class RemoteProfile(val homeId: String, val domain: String) {
  val usable: Boolean
    get() = isHomeId(homeId) && isDomain(domain)

  fun admits(host: String): Boolean =
    usable && RelayHosts.services.any { service -> host == "$service--$homeId.$domain" }
}

object RelayHosts {
  val services: List<String> = listOf(
    "auth",
    "identity",
    "sync",
    "camera",
    "productivity",
    "notification",
    "guard",
    "settings",
  )

  fun admission(host: String, pairedHost: String, remote: RemoteProfile): HostAdmission = when {
    pairedHost.isNotEmpty() && host.equals(pairedHost, ignoreCase = true) -> HostAdmission.Paired
    remote.admits(host) -> HostAdmission.Relay
    else -> HostAdmission.Refused
  }

  fun targetAdmission(url: String, pairedHost: String, remote: RemoteProfile): HostAdmission {
    val target = httpUrlOf(url) ?: return HostAdmission.Refused
    if (!target.isHttps) return HostAdmission.Refused
    return admission(target.host, pairedHost, remote)
  }

  private fun httpUrlOf(url: String): HttpUrl? {
    val http = when {
      url.startsWith("wss:", ignoreCase = true) -> "https:" + url.substring(4)
      url.startsWith("ws:", ignoreCase = true) -> "http:" + url.substring(3)
      else -> url
    }
    return http.toHttpUrlOrNull()
  }
}

private fun isHomeId(value: String): Boolean =
  value.length == HOME_ID_LENGTH && value.all { it in '0'..'9' || it in 'a'..'f' }

private fun isLabel(label: String): Boolean =
  label.length in 1..LABEL_MAX_LENGTH &&
    !label.startsWith('-') &&
    !label.endsWith('-') &&
    label.all { it in 'a'..'z' || it in '0'..'9' || it == '-' }

private fun isTopLevel(label: String): Boolean =
  label.length in 2..LABEL_MAX_LENGTH && label.all { it in 'a'..'z' }

private fun isDomain(value: String): Boolean {
  val labels = value.split('.')
  return value.length <= DOMAIN_MAX_LENGTH &&
    labels.size >= 2 &&
    labels.all(::isLabel) &&
    isTopLevel(labels.last())
}
