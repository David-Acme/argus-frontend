package com.margelo.nitro.net

import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream
import java.net.ConnectException
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.NoRouteToHostException
import java.net.PortUnreachableException
import java.net.Socket
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.security.KeyStore
import java.security.MessageDigest
import java.security.SecureRandom
import java.security.cert.CertificateException
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLHandshakeException
import javax.net.ssl.SSLPeerUnverifiedException
import javax.net.ssl.SSLSession
import javax.net.ssl.SSLSocket
import javax.net.ssl.TrustManager
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager
import okhttp3.Dns
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.OkHttpClient

private const val SAN_DNS_NAME = 2
private const val CONNECT_TIMEOUT_SECONDS = 10L
private const val READ_TIMEOUT_SECONDS = 30L
private const val MIN_WAIT_MS = 1L
private const val HTTPS_PORT = 443
private val STATUS_PREFIX = "HTTP/1.".toByteArray(Charsets.US_ASCII)
private val CREDENTIAL_HEADERS = setOf("authorization", "cookie", "x-argus-device-credential")

data class TransportConfig(
  val caPem: String,
  val pairedHost: String,
  val pairedIp: String,
  val remote: RemoteProfile,
)

data class ProbeReply(val outcome: String, val address: String, val fingerprint: String)

fun interface HostLookup {
  fun lookup(host: String): List<InetAddress>
}

private class Witness(private val delegate: X509TrustManager) : X509TrustManager {
  @Volatile
  var seen: X509Certificate? = null

  @Volatile
  var refused = false

  override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {
    delegate.checkClientTrusted(chain, authType)
  }

  override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {
    seen = chain?.firstOrNull()
    try {
      delegate.checkServerTrusted(chain, authType)
    } catch (error: CertificateException) {
      refused = true
      throw error
    }
  }

  override fun getAcceptedIssuers(): Array<X509Certificate> = delegate.acceptedIssuers
}

class StrictTransport(
  private val config: TransportConfig,
  private val lookup: HostLookup = HostLookup { host -> Dns.SYSTEM.lookup(host) },
) {

  private val trustManager: X509TrustManager by lazy { anchoredTrustManager(config.caPem) }

  val client: OkHttpClient by lazy {
    val context = SSLContext.getInstance("TLS")
    context.init(null, arrayOf<TrustManager>(trustManager), SecureRandom())
    OkHttpClient.Builder()
      .sslSocketFactory(context.socketFactory, trustManager)
      .hostnameVerifier { hostname, session -> admits(hostname, session) }
      .dns(
        object : Dns {
          override fun lookup(hostname: String): List<InetAddress> = resolve(hostname)
        },
      )
      .followRedirects(false)
      .followSslRedirects(false)
      .connectTimeout(CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
      .readTimeout(READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
      .build()
  }

  fun admits(hostname: String, session: SSLSession): Boolean =
    when (RelayHosts.admission(hostname, config.pairedHost, config.remote)) {
      HostAdmission.Paired -> true
      HostAdmission.Relay -> leafNamesHost(session, hostname)
      HostAdmission.Refused -> false
    }

  private fun resolve(hostname: String): List<InetAddress> =
    if (hostname.equals(config.pairedHost, ignoreCase = true)) {
      listOf(InetAddress.getByName(config.pairedIp))
    } else {
      lookup.lookup(hostname)
    }

  fun probe(url: String, headers: Map<String, String>, timeoutMs: Long): ProbeReply {
    val target = url.toHttpUrlOrNull()?.takeIf { it.isHttps }
      ?: throw IllegalStateException("HOST_NOT_ALLOWED|A probe goes over https only")
    if (RelayHosts.admission(target.host, config.pairedHost, config.remote) == HostAdmission.Refused) {
      throw IllegalStateException("HOST_NOT_ALLOWED|Host is not allowed")
    }
    val deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(timeoutMs)
    val address = try {
      resolve(target.host).firstOrNull()
    } catch (error: UnknownHostException) {
      null
    } ?: return ProbeReply("dns", "", "")
    val endpoint = InetSocketAddress(address, target.port)
    val socket = Socket()
    try {
      socket.connect(endpoint, left(deadline))
    } catch (error: IOException) {
      socket.close()
      return ProbeReply("connect", labelOf(endpoint), "")
    }
    val witness = Witness(trustManager)
    return try {
      socket.soTimeout = left(deadline)
      val context = SSLContext.getInstance("TLS")
      context.init(null, arrayOf<TrustManager>(witness), SecureRandom())
      (context.socketFactory.createSocket(socket, target.host, target.port, true) as SSLSocket).use { tls ->
        tls.startHandshake()
        if (!admits(target.host, tls.session)) {
          return ProbeReply("pin", labelOf(endpoint), fingerprintOf(witness.seen))
        }
        tls.outputStream.write(probeRequest(target, headers))
        tls.outputStream.flush()
        ProbeReply(if (answered(tls.inputStream)) "reached" else "tls-peer-closed", labelOf(endpoint), "")
      }
    } catch (error: IOException) {
      socket.close()
      if (witness.refused) {
        ProbeReply("pin", labelOf(endpoint), fingerprintOf(witness.seen))
      } else {
        ProbeReply("tls-peer-closed", labelOf(endpoint), "")
      }
    }
  }

  companion object {
    fun anchoredTrustManager(caPem: String): X509TrustManager {
      val ca = CertificateFactory.getInstance("X.509")
        .generateCertificate(ByteArrayInputStream(caPem.toByteArray(Charsets.US_ASCII)))
      val keyStore = KeyStore.getInstance(KeyStore.getDefaultType()).apply {
        load(null)
        setCertificateEntry("argus", ca)
      }
      val factory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
      factory.init(keyStore)
      return factory.trustManagers.filterIsInstance<X509TrustManager>().first()
    }

    fun leafNamesHost(session: SSLSession, host: String): Boolean {
      val leaf = runCatching { session.peerCertificates.firstOrNull() as? X509Certificate }.getOrNull()
        ?: return false
      val names = runCatching { leaf.subjectAlternativeNames }.getOrNull() ?: return false
      return names.any { entry ->
        entry.size >= 2 && entry[0] == SAN_DNS_NAME && (entry[1] as? String).equals(host, ignoreCase = true)
      }
    }

    fun codeOf(error: IOException): String = when {
      generateSequence<Throwable>(error) { it.cause }.any {
        it is CertificateException || it is SSLPeerUnverifiedException
      } -> "CERT_NOT_TRUSTED"
      error is SocketTimeoutException -> "TIMEOUT"
      neverConnected(error) -> "NETWORK_ERROR"
      else -> "CONNECTION_LOST"
    }

    private fun neverConnected(error: IOException): Boolean =
      generateSequence<Throwable>(error) { it.cause }.any {
        it is ConnectException ||
          it is NoRouteToHostException ||
          it is UnknownHostException ||
          it is PortUnreachableException ||
          it is SSLHandshakeException
      }

    fun fingerprintOf(certificate: X509Certificate?): String =
      certificate?.let { sha256Hex(it.encoded) } ?: ""

    fun sha256Hex(bytes: ByteArray): String =
      MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02X".format(it) }

    fun probeRequest(target: HttpUrl, headers: Map<String, String>): ByteArray {
      val authority = if (target.port == HTTPS_PORT) target.host else "${target.host}:${target.port}"
      val path = target.encodedPath + (target.encodedQuery?.let { "?$it" } ?: "")
      val lines = StringBuilder()
        .append("GET ").append(path).append(" HTTP/1.1\r\n")
        .append("Host: ").append(authority).append("\r\n")
        .append("Accept: application/json\r\n")
        .append("Connection: close\r\n")
      headers
        .filterKeys { it.lowercase() !in CREDENTIAL_HEADERS && it.lowercase() != "host" }
        .filter { (name, value) -> (name + value).none { it == '\r' || it == '\n' } }
        .forEach { (name, value) -> lines.append(name).append(": ").append(value).append("\r\n") }
      return lines.append("\r\n").toString().toByteArray(Charsets.UTF_8)
    }

    private fun answered(input: InputStream): Boolean {
      val head = ByteArray(STATUS_PREFIX.size)
      var filled = 0
      while (filled < head.size) {
        val read = try {
          input.read(head, filled, head.size - filled)
        } catch (error: IOException) {
          -1
        }
        if (read <= 0) return false
        filled += read
      }
      return head.contentEquals(STATUS_PREFIX)
    }

    private fun left(deadline: Long): Int =
      TimeUnit.NANOSECONDS.toMillis(deadline - System.nanoTime()).coerceAtLeast(MIN_WAIT_MS).toInt()

    private fun labelOf(endpoint: InetSocketAddress): String =
      "${endpoint.address.hostAddress}:${endpoint.port}"
  }
}
