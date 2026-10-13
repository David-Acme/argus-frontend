package com.margelo.nitro.net

import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RelayHostsTest {
  private val vectors = JSONObject(File(requireNotNull(System.getProperty("argus.relayVectors"))).readText())
  private val remote = profileOf(vectors)
  private val home = remote.homeId

  private fun profileOf(json: JSONObject) = RemoteProfile(json.getString("homeId"), json.getString("domain"))

  private fun hosts(key: String): List<String> {
    val entries = vectors.getJSONArray(key)
    return List(entries.length()) { entries.getString(it) }
  }

  private fun profiles(key: String): List<RemoteProfile> {
    val entries = vectors.getJSONArray(key)
    return List(entries.length()) { profileOf(entries.getJSONObject(it)) }
  }

  private fun namesOf(profile: RemoteProfile): List<String> =
    RelayHosts.services.map { service -> "$service--${profile.homeId}.${profile.domain}" }

  @Test
  fun eachAdmittedVectorIsOneOfThisHomesEightDeviceNames() {
    val admitted = hosts("admitted")
    assertEquals(RelayHosts.services.size, admitted.size)
    assertEquals(namesOf(remote).sorted(), admitted.sorted())
    admitted.forEach { host -> assertTrue(host, remote.admits(host)) }
  }

  @Test
  fun eachRefusedVectorIsRefused() {
    val refused = hosts("refused")
    assertTrue(refused.size >= 30)
    refused.forEach { host -> assertFalse(host, remote.admits(host)) }
  }

  @Test
  fun aUsableProfileAdmitsEachOfItsEightDeviceNames() {
    val usable = profiles("usableProfiles")
    assertTrue(usable.size >= 5)
    usable.forEach { profile ->
      assertTrue(profile.toString(), profile.usable)
      namesOf(profile).forEach { host -> assertTrue(host, profile.admits(host)) }
    }
  }

  @Test
  fun anUnusableProfileAdmitsNothingNotEvenItsOwnNames() {
    val unusable = profiles("unusableProfiles")
    assertTrue(unusable.size >= 20)
    unusable.forEach { profile ->
      assertFalse(profile.toString(), profile.usable)
      namesOf(profile).forEach { host -> assertFalse(host, profile.admits(host)) }
    }
  }

  @Test
  fun thePairedHostStaysAdmittedAndADeviceNameIsAdmittedAsTheRelay() {
    assertEquals(HostAdmission.Paired, RelayHosts.admission("ARGUS.local", "argus.local", remote))
    assertEquals(HostAdmission.Paired, RelayHosts.admission("argus.local", "argus.local", RemoteProfile("", "")))
    assertEquals(HostAdmission.Relay, RelayHosts.admission("sync--$home.argus-tunnel.lynk.page", "argus.local", remote))
    assertEquals(
      HostAdmission.Refused,
      RelayHosts.admission("sync--$home.argus-tunnel.lynk.page", "argus.local", RemoteProfile("", "")),
    )
    assertEquals(HostAdmission.Refused, RelayHosts.admission("argus.example", "argus.local", remote))
    assertEquals(HostAdmission.Refused, RelayHosts.admission("", "", remote))
  }

  @Test
  fun aTargetIsAdmittedOnlyOverTlsAndOnlyForAnAdmittedHost() {
    val relay = "sync--$home.argus-tunnel.lynk.page"
    val admitted = mapOf(
      "https://argus.local:7042/auth/status" to HostAdmission.Paired,
      "wss://argus.local:7025/sync" to HostAdmission.Paired,
      "https://$relay/sync" to HostAdmission.Relay,
      "wss://$relay/sync" to HostAdmission.Relay,
      "WSS://$relay:443/sync" to HostAdmission.Relay,
      "https://SYNC--$home.ARGUS-TUNNEL.LYNK.PAGE/sync" to HostAdmission.Relay,
    )
    admitted.forEach { (url, expected) ->
      assertEquals(url, expected, RelayHosts.targetAdmission(url, "argus.local", remote))
    }
    val refused = listOf(
      "http://argus.local:7042/auth/status",
      "ws://argus.local:7025/sync",
      "http://$relay/sync",
      "ws://$relay/sync",
      "https://argus.example/sync",
      "https://$relay.example.com/sync",
      "https://x.$relay/sync",
      "https://rtc--$home.argus-tunnel.lynk.page/rtc",
      "https://аuth--$home.argus-tunnel.lynk.page/auth",
      "ftp://$relay/sync",
      "not a url",
      "",
    )
    refused.forEach { url ->
      assertEquals(url, HostAdmission.Refused, RelayHosts.targetAdmission(url, "argus.local", remote))
    }
  }
}
