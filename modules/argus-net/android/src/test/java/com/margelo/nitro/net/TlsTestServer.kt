package com.margelo.nitro.net

import java.io.File
import java.io.IOException
import java.io.InputStream
import java.net.InetAddress
import java.net.ServerSocket
import java.security.KeyFactory
import java.security.KeyStore
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.security.spec.PKCS8EncodedKeySpec
import java.util.Base64
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocket
import kotlin.concurrent.thread
import org.json.JSONObject

private const val SERVER_WAIT_MS = 3000
private const val SILENCE_MS = 900L
private const val JOIN_MS = 5000L
private val PASSWORD = "argus-test".toCharArray()

data class TlsIdentity(val cert: String, val key: String)

class TlsVectors(document: JSONObject) {
  val lanHost: String = document.getString("lanHost")
  val homeId: String = document.getString("homeId")
  val domain: String = document.getString("domain")
  val relayHost: String = document.getString("relayHost")
  val ca: String = document.getString("ca")
  val home = identity(document, "home")
  val rogue = identity(document, "rogue")
  val misnamed = identity(document, "misnamed")

  private fun identity(document: JSONObject, key: String): TlsIdentity =
    TlsIdentity(document.getJSONObject(key).getString("cert"), document.getJSONObject(key).getString("key"))

  companion object {
    fun load(): TlsVectors =
      TlsVectors(JSONObject(File(requireNotNull(System.getProperty("argus.tlsVectors"))).readText()))

    fun certificateOf(pem: String): X509Certificate =
      CertificateFactory.getInstance("X.509").generateCertificate(pem.byteInputStream()) as X509Certificate
  }
}

enum class Behaviour {
  Answer,
  Close,
  Silent,
}

private fun serverContext(identity: TlsIdentity): SSLContext {
  val body = identity.key.lines().filter { it.isNotBlank() && !it.startsWith("-----") }.joinToString("")
  val key = KeyFactory.getInstance("EC").generatePrivate(PKCS8EncodedKeySpec(Base64.getDecoder().decode(body)))
  val store = KeyStore.getInstance("PKCS12").apply {
    load(null, null)
    setKeyEntry("server", key, PASSWORD, arrayOf(TlsVectors.certificateOf(identity.cert)))
  }
  val managers = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm()).apply { init(store, PASSWORD) }
  return SSLContext.getInstance("TLS").apply { init(managers.keyManagers, null, null) }
}

private fun requestOf(input: InputStream): ByteArray {
  val request = java.io.ByteArrayOutputStream()
  val chunk = ByteArray(1024)
  while (!request.toString(Charsets.UTF_8.name()).contains("\r\n\r\n")) {
    val read = try {
      input.read(chunk)
    } catch (error: IOException) {
      -1
    }
    if (read <= 0) break
    request.write(chunk, 0, read)
  }
  return request.toByteArray()
}

class TlsTestServer(identity: TlsIdentity, private val behaviour: Behaviour) : AutoCloseable {
  private val server: ServerSocket =
    if (behaviour == Behaviour.Answer) {
      serverContext(identity).serverSocketFactory.createServerSocket(0, 8, InetAddress.getLoopbackAddress())
    } else {
      ServerSocket(0, 8, InetAddress.getLoopbackAddress())
    }

  val port: Int = server.localPort

  @Volatile
  private var plaintext = ByteArray(0)

  private val worker = thread {
    runCatching {
      server.accept().use { socket ->
        when (behaviour) {
          Behaviour.Answer -> answer(socket as SSLSocket)
          Behaviour.Close -> Unit
          Behaviour.Silent -> Thread.sleep(SILENCE_MS)
        }
      }
    }
  }

  private fun answer(socket: SSLSocket) {
    socket.soTimeout = SERVER_WAIT_MS
    try {
      socket.startHandshake()
    } catch (error: IOException) {
      return
    }
    plaintext = requestOf(socket.inputStream)
    socket.outputStream.write("HTTP/1.1 200 OK\r\ncontent-length: 2\r\nconnection: close\r\n\r\n{}".toByteArray())
    socket.outputStream.flush()
  }

  fun finish(): ByteArray {
    worker.join(JOIN_MS)
    return plaintext
  }

  override fun close() {
    server.close()
  }
}
