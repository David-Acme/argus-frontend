package com.margelo.nitro.net

import java.io.EOFException
import java.io.IOException
import java.net.ConnectException
import java.net.SocketException
import java.net.SocketTimeoutException
import java.net.InetAddress
import java.net.ServerSocket
import java.net.UnknownHostException
import okhttp3.Request
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

private const val TIMEOUT_MS = 1500L
private const val SHORT_TIMEOUT_MS = 300L
private val CREDENTIAL_MARKS = listOf("authorization:", "cookie:", "x-argus-device-credential:", "bearer ")

class StrictTransportTest {
  private val vectors = TlsVectors.load()

  private val transport = StrictTransport(
    TransportConfig(
      caPem = vectors.ca,
      pairedHost = vectors.lanHost,
      pairedIp = "127.0.0.1",
      remote = RemoteProfile(vectors.homeId, vectors.domain),
    ),
    HostLookup { host ->
      if (host == vectors.relayHost) listOf(InetAddress.getLoopbackAddress()) else throw UnknownHostException(host)
    },
  )

  private val identityHeaders = mapOf("User-Agent" to "Argus/1 (android)", "X-Argus-Client" to "android/1.0.0")

  private fun lanUrl(port: Int) = "https://${vectors.lanHost}:$port/pairing/status"

  private fun relayUrl(port: Int) = "https://${vectors.relayHost}:$port/pairing/status"

  private fun fingerprintOf(identity: TlsIdentity) =
    StrictTransport.sha256Hex(TlsVectors.certificateOf(identity.cert).encoded)

  private fun freePort(): Int = ServerSocket(0, 1, InetAddress.getLoopbackAddress()).use { it.localPort }

  @Test
  fun aHomeUnderThePinnedCaIsReachedAndTheProbeCarriesNoCredential() {
    TlsTestServer(vectors.home, Behaviour.Answer).use { server ->
      val headers = identityHeaders + mapOf(
        "Authorization" to "Bearer secret-token",
        "Cookie" to "session=secret",
        "X-Argus-Device-Credential" to "secret-credential",
      )
      val reply = transport.probe(lanUrl(server.port), headers, TIMEOUT_MS)
      val request = String(server.finish(), Charsets.UTF_8)
      assertEquals("reached", reply.outcome)
      assertTrue(request, request.startsWith("GET /pairing/status HTTP/1.1\r\n"))
      assertTrue(request, request.contains("X-Argus-Client: android/1.0.0"))
      CREDENTIAL_MARKS.forEach { mark -> assertFalse(request, request.lowercase().contains(mark)) }
      assertFalse(request, request.contains("secret"))
    }
  }

  @Test
  fun aDeviceNameUnderThePinnedCaIsReached() {
    TlsTestServer(vectors.home, Behaviour.Answer).use { server ->
      assertEquals("reached", transport.probe(relayUrl(server.port), identityHeaders, TIMEOUT_MS).outcome)
      server.finish()
    }
  }

  @Test
  fun aCertificateFromAnotherCaIsAPinFailureAndNothingCrossesIt() {
    TlsTestServer(vectors.rogue, Behaviour.Answer).use { server ->
      val reply = transport.probe(lanUrl(server.port), identityHeaders, TIMEOUT_MS)
      assertEquals("pin", reply.outcome)
      assertEquals(fingerprintOf(vectors.rogue), reply.fingerprint)
      assertEquals("127.0.0.1:${server.port}", reply.address)
      assertEquals(0, server.finish().size)
    }
  }

  @Test
  fun aDeviceNameTheLeafDoesNotNameIsAPinFailure() {
    TlsTestServer(vectors.misnamed, Behaviour.Answer).use { server ->
      val reply = transport.probe(relayUrl(server.port), identityHeaders, TIMEOUT_MS)
      assertEquals("pin", reply.outcome)
      assertEquals(fingerprintOf(vectors.misnamed), reply.fingerprint)
      assertEquals(0, server.finish().size)
    }
  }

  @Test
  fun thePairedHostAnswersToThePinnedCaAloneAsTheClientDoes() {
    TlsTestServer(vectors.misnamed, Behaviour.Answer).use { server ->
      assertEquals("reached", transport.probe(lanUrl(server.port), identityHeaders, TIMEOUT_MS).outcome)
      server.finish()
    }
  }

  @Test
  fun aPeerThatClosesDuringTheHandshakeIsTlsPeerClosed() {
    TlsTestServer(vectors.home, Behaviour.Close).use { server ->
      assertEquals("tls-peer-closed", transport.probe(lanUrl(server.port), identityHeaders, TIMEOUT_MS).outcome)
      server.finish()
    }
  }

  @Test
  fun aPeerThatConnectsAndStaysSilentIsTlsPeerClosed() {
    TlsTestServer(vectors.home, Behaviour.Silent).use { server ->
      assertEquals("tls-peer-closed", transport.probe(lanUrl(server.port), identityHeaders, SHORT_TIMEOUT_MS).outcome)
      server.finish()
    }
  }

  @Test
  fun aRefusedTcpConnectionIsConnect() {
    assertEquals("connect", transport.probe(lanUrl(freePort()), identityHeaders, TIMEOUT_MS).outcome)
  }

  @Test
  fun aDeviceNameThatDoesNotResolveIsDns() {
    val unresolved = StrictTransport(
      TransportConfig(vectors.ca, vectors.lanHost, "127.0.0.1", RemoteProfile(vectors.homeId, vectors.domain)),
      HostLookup { host -> throw UnknownHostException(host) },
    )
    val reply = unresolved.probe(relayUrl(443), identityHeaders, TIMEOUT_MS)
    assertEquals("dns", reply.outcome)
    assertEquals("", reply.address)
  }

  @Test
  fun aNameTheHomeDoesNotOwnIsRefusedBeforeAnyConnection() {
    try {
      transport.probe("https://argus.example/pairing/status", identityHeaders, TIMEOUT_MS)
      fail("the probe should refuse argus.example")
    } catch (error: IllegalStateException) {
      assertTrue(error.message.orEmpty().startsWith("HOST_NOT_ALLOWED|"))
    }
  }

  @Test
  fun aRequestToAServerThatFailsThePinIsRefusedBeforeAnyHeaderLeaves() {
    TlsTestServer(vectors.rogue, Behaviour.Answer).use { server ->
      val request = Request.Builder()
        .url("https://${vectors.lanHost}:${server.port}/auth/status")
        .header("Authorization", "Bearer secret-token")
        .build()
      val code = try {
        transport.client.newCall(request).execute().close()
        "ANSWERED"
      } catch (error: IOException) {
        StrictTransport.codeOf(error)
      }
      assertEquals("CERT_NOT_TRUSTED", code)
      assertEquals(0, server.finish().size)
    }
  }

  @Test
  fun aConnectionThatNeverOpenedIsANetworkError() {
    assertEquals("NETWORK_ERROR", StrictTransport.codeOf(ConnectException("Failed to connect to /192.168.18.205:7042")))
    assertEquals("NETWORK_ERROR", StrictTransport.codeOf(UnknownHostException("argus.local")))
    assertEquals("NETWORK_ERROR", StrictTransport.codeOf(IOException("wrapped", ConnectException("refused"))))
  }

  @Test
  fun aConnectionLostAfterTheRequestLeftIsNotANetworkError() {
    assertEquals("CONNECTION_LOST", StrictTransport.codeOf(EOFException("unexpected end of stream")))
    assertEquals("CONNECTION_LOST", StrictTransport.codeOf(SocketException("Connection reset")))
    assertEquals("TIMEOUT", StrictTransport.codeOf(SocketTimeoutException("timeout")))
  }
}
