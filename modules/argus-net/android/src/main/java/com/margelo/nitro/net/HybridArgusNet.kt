package com.margelo.nitro.net

import android.content.Context
import android.net.Uri
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.net.InetAddress
import java.security.KeyStore
import java.security.MessageDigest
import java.security.SecureRandom
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.util.concurrent.Executor
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Dns
import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okio.BufferedSink
import okio.source
import org.json.JSONObject
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

private const val SERVICE_TYPE = "_argus._tcp."
private const val DEFAULT_HOST = "argus.local"
private const val PAIRING_PATH = "/pairing"

@DoNotStrip
class HybridArgusNet : HybridArgusNetSpec() {

  private var caPem: String = ""
  private var allowedHost: String = DEFAULT_HOST
  private var ip: String = ""

  @Volatile
  private var cachedClient: CachedStrictClient? = null

  private class CachedStrictClient(val config: String, val client: OkHttpClient)

  override fun discover(timeoutMs: Double): Promise<NetDiscovery> {
    return Promise.async { discoverInternal(timeoutMs) }
  }

  override fun pair(host: String, ip: String, port: Double, code: String): Promise<NetPairing> {
    return Promise.async { pairInternal(host, ip, port, code) }
  }

  override fun configure(caPem: String, allowedHost: String, ip: String) {
    if (caPem == this.caPem && allowedHost == this.allowedHost && ip == this.ip) return
    this.caPem = caPem
    this.allowedHost = allowedHost
    this.ip = ip
    cachedClient = null
  }

  private fun netError(code: String, message: String): IllegalStateException =
    IllegalStateException("$code|$message")

  override fun request(options: NetHttpRequest): Promise<NetHttpResult> {
    return Promise.async { requestInternal(options) }
  }

  override fun openSocket(options: NetSocketOptions): Promise<HybridArgusSocketSpec> {
    return Promise.async {
      if (caPem.isEmpty()) {
        throw netError("PAIRING_REQUIRED", "Server is not paired yet")
      }
      ArgusSocket(strictClient(), options.url, options.headers, options.connectTimeoutMs)
    }
  }

  // MARK: - Discovery (mDNS)

  private suspend fun discoverInternal(timeoutMs: Double): NetDiscovery {
    val context = requireNotNull(NitroModules.applicationContext) { "React context unavailable" }
    val nsdManager = context.getSystemService(Context.NSD_SERVICE) as NsdManager
    val mainHandler = Handler(Looper.getMainLooper())
    return suspendCoroutine { cont ->
      var finished = false
      lateinit var discoveryListener: NsdManager.DiscoveryListener

      fun finish(result: NetDiscovery?) {
        if (finished) return
        finished = true
        mainHandler.removeCallbacksAndMessages(null)
        runCatching { nsdManager.stopServiceDiscovery(discoveryListener) }
        if (result == null) {
          cont.resumeWithException(netError("DISCOVERY_NOT_FOUND", "No Argus server found on the network"))
        } else {
          cont.resume(result)
        }
      }

      val resolveListener = object : NsdManager.ResolveListener {
        override fun onResolveFailed(serviceInfo: NsdServiceInfo?, errorCode: Int) {}

        override fun onServiceResolved(serviceInfo: NsdServiceInfo) {
          val resolvedIp = resolveHostAddress(serviceInfo)
          finish(
            NetDiscovery(
              host = DEFAULT_HOST,
              ip = resolvedIp,
              port = serviceInfo.port.toDouble(),
              https = true,
            ),
          )
        }
      }

      discoveryListener = object : NsdManager.DiscoveryListener {
        override fun onDiscoveryStarted(serviceType: String?) {}

        override fun onDiscoveryStopped(serviceType: String?) {}

        override fun onStartDiscoveryFailed(serviceType: String?, errorCode: Int) {
          finish(null)
        }

        override fun onStopDiscoveryFailed(serviceType: String?, errorCode: Int) {}

        override fun onServiceFound(serviceInfo: NsdServiceInfo) {
          if (!finished && serviceInfo.serviceType == SERVICE_TYPE) {
            val mainExecutor = Executor { command -> mainHandler.post(command) }
            resolveService(nsdManager, serviceInfo, resolveListener, mainExecutor)
          }
        }

        override fun onServiceLost(serviceInfo: NsdServiceInfo) {}
      }

      mainHandler.post {
        try {
          nsdManager.discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discoveryListener)
        } catch (e: Exception) {
          finish(null)
        }
      }
      mainHandler.postDelayed({ finish(null) }, timeoutMs.toLong())
    }
  }

  // MARK: - Pairing (one-time trust-any)

  private suspend fun pairInternal(host: String, ip: String, port: Double, code: String): NetPairing =
    withContext(Dispatchers.IO) {
      val client = trustAllClient()
      val url = "https://$ip:${port.toInt()}$PAIRING_PATH"
      val payload = JSONObject().put("code", code.trim()).toString()
      val request = Request.Builder()
        .url(url)
        .header("Content-Type", "application/json")
        .post(stringBody(payload))
        .build()

      client.newCall(request).execute().use { response ->
        val raw = response.body?.string() ?: ""
        if (response.code != 200) {
          when (response.code) {
            403 -> throw netError("INVALID_PAIRING_CODE", "Invalid pairing code")
            409 -> throw netError("ALREADY_PAIRED", "Server already paired")
            else -> throw netError("NETWORK_ERROR", "Pairing failed (HTTP ${response.code})")
          }
        }
        val root = JSONObject(raw)
        val info = root.optJSONObject("info")
          ?: throw netError("NETWORK_ERROR", "Malformed pairing response")
        val caFingerprint = info.optString("caFingerprint", "").uppercase()
        val expected = code.trim().uppercase()
        if (expected.isNotEmpty() && !caFingerprint.startsWith(expected)) {
          throw netError("INVALID_PAIRING_CODE", "Invalid pairing code")
        }
        val caPem = info.getString("caPem")
        verifyCaFingerprint(caPem, caFingerprint)
        NetPairing(
          caPem = caPem,
          caFingerprint = caFingerprint,
          serverFingerprint = info.optString("serverFingerprint", ""),
          instanceId = info.optString("instanceId", ""),
          port = info.optDouble("port", port),
          scheme = info.optString("scheme", "https"),
        )
      }
    }

  private fun verifyCaFingerprint(caPem: String, caFingerprint: String) {
    val certificate = runCatching {
      CertificateFactory.getInstance("X.509")
        .generateCertificate(ByteArrayInputStream(caPem.toByteArray(Charsets.US_ASCII)))
    }.getOrElse { throw netError("CERT_NOT_TRUSTED", "Invalid CA certificate") }
    val actual = MessageDigest.getInstance("SHA-256")
      .digest(certificate.encoded)
      .joinToString("") { "%02X".format(it) }
    if (!actual.equals(caFingerprint, ignoreCase = true)) {
      throw netError("FINGERPRINT_MISMATCH", "The server CA does not match the pairing code")
    }
  }

  // MARK: - Strict request

  private suspend fun requestInternal(options: NetHttpRequest): NetHttpResult =
    withContext(Dispatchers.IO) {
      val trustAny = options.trustAny == true
      if (!trustAny && caPem.isEmpty()) {
        throw netError("PAIRING_REQUIRED", "Server is not paired yet")
      }
      val client = if (trustAny) trustAllClient() else strictClient()
      val builder = Request.Builder().url(options.url)
      options.headers.forEach { (key, value) -> builder.header(key, value) }

      val request = if (options.files.isNotEmpty()) {
        builder.method(options.method.uppercase(), buildMultipartBody(options)).build()
      } else {
        when (options.method.uppercase()) {
          "GET" -> builder.get().build()
          "DELETE" -> builder.delete().build()
          else -> {
            val requestBody =
              if (options.body.isEmpty()) stringBody("")
              else stringBody(options.body)
            builder.method(options.method.uppercase(), requestBody).build()
          }
        }
      }

      client.newCall(request).execute().use { response ->
        val responseBody = response.body?.string() ?: ""
        val outHeaders = LinkedHashMap<String, String>()
        response.headers.forEach { (name, value) -> outHeaders[name] = value }
        NetHttpResult(
          status = response.code.toDouble(),
          headers = outHeaders,
          body = responseBody,
        )
      }
    }

  private fun buildMultipartBody(options: NetHttpRequest): RequestBody {
    val builder = MultipartBody.Builder().setType(MultipartBody.FORM)
    if (options.body.isNotEmpty()) {
      addMultipartFields(builder, options.body)
    }
    for (file in options.files) {
      builder.addFormDataPart(file.name, file.filename, readFilePart(file))
    }
    return builder.build()
  }

  /**
   * The API consumes regular multipart fields (`lang`, `name`, ...), not a
   * JSON part called `payload`. Keep the JSON fallback so other callers can
   * still send an opaque body without silently losing it.
   */
  private fun addMultipartFields(builder: MultipartBody.Builder, body: String) {
    val fields = runCatching { JSONObject(body) }.getOrNull()
    if (fields == null) {
      builder.addFormDataPart("payload", body)
      return
    }
    val keys = fields.keys()
    while (keys.hasNext()) {
      val key = keys.next()
      val value = fields.optString(key, "")
      builder.addFormDataPart(key, value)
    }
  }

  private fun readFilePart(file: NetHttpFile): RequestBody {
    val uri = Uri.parse(file.uri)
    val context = NitroModules.applicationContext
    if (uri.scheme == "content" && context != null) {
      return streamBody(
        {
          context.contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Cannot open ${file.uri}")
        },
        contentType = file.contentType.toMediaTypeOrNull(),
      )
    }
    val path = uri.path ?: file.uri.removePrefix("file://")
    val fileOnDisk = File(path)
    if (!fileOnDisk.exists()) {
      throw IllegalStateException("File not found: ${file.uri}")
    }
    return streamBody(
      { FileInputStream(fileOnDisk) },
      fileOnDisk.length(),
      file.contentType.toMediaTypeOrNull(),
    )
  }

  // MARK: - Body factories (streaming, no deprecated OkHttp API)

  private fun stringBody(content: String): RequestBody = object : RequestBody() {
    override fun contentType(): MediaType? = null

    override fun writeTo(sink: BufferedSink) {
      sink.writeUtf8(content)
    }
  }

  private fun streamBody(
    open: () -> InputStream,
    length: Long? = null,
    contentType: MediaType? = null,
  ): RequestBody =
    object : RequestBody() {
      override fun contentType(): MediaType? = contentType

      override fun contentLength(): Long = length ?: -1L

      override fun writeTo(sink: BufferedSink) {
        open().use { input ->
          sink.writeAll(input.source())
        }
      }
    }

  // MARK: - NsdManager helpers (future-proof: API 30+ overloads, deprecated fallback for older)

  private fun resolveHostAddress(serviceInfo: NsdServiceInfo): String {
    @Suppress("DEPRECATION")
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      serviceInfo.hostAddresses?.firstOrNull()?.hostAddress
        ?: serviceInfo.host?.hostAddress
        ?: ""
    } else {
      serviceInfo.host?.hostAddress ?: ""
    }
  }

  @Suppress("DEPRECATION")
  private fun resolveService(
    nsdManager: NsdManager,
    serviceInfo: NsdServiceInfo,
    listener: NsdManager.ResolveListener,
    mainExecutor: Executor,
  ) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      nsdManager.resolveService(serviceInfo, mainExecutor, listener)
    } else {
      nsdManager.resolveService(serviceInfo, listener)
    }
  }

  // MARK: - Clients

  private fun strictClient(): OkHttpClient {
    val config = "$caPem|$allowedHost|$ip"
    cachedClient?.let { cached ->
      if (cached.config == config) return cached.client
    }

    val client = buildStrictClient()
    cachedClient = CachedStrictClient(config, client)
    return client
  }

  private fun buildStrictClient(): OkHttpClient {
    val certFactory = CertificateFactory.getInstance("X.509")
    val ca = certFactory.generateCertificate(ByteArrayInputStream(caPem.toByteArray(Charsets.US_ASCII)))
    val keyStore = KeyStore.getInstance(KeyStore.getDefaultType()).apply {
      load(null)
      setCertificateEntry("argus", ca)
    }
    val trustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
    trustManagerFactory.init(keyStore)
    val trustManager = trustManagerFactory.trustManagers.filterIsInstance<X509TrustManager>().first()

    val sslContext = SSLContext.getInstance("TLS")
    sslContext.init(null, arrayOf<TrustManager>(trustManager), SecureRandom())

    return OkHttpClient.Builder()
      .sslSocketFactory(sslContext.socketFactory, trustManager)
      .hostnameVerifier { hostname, _ -> hostname.equals(allowedHost, ignoreCase = true) }
      .dns(
        object : Dns {
          override fun lookup(hostname: String): List<InetAddress> {
            return if (hostname.equals(allowedHost, ignoreCase = true)) {
              listOf(InetAddress.getByName(ip))
            } else {
              Dns.SYSTEM.lookup(hostname)
            }
          }
        },
      )
      .connectTimeout(10, TimeUnit.SECONDS)
      .readTimeout(30, TimeUnit.SECONDS)
      .build()
  }

  private fun trustAllClient(): OkHttpClient {
    val trustAll = object : X509TrustManager {
      override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
      override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
      override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
    }
    val sslContext = SSLContext.getInstance("TLS")
    sslContext.init(null, arrayOf<TrustManager>(trustAll), SecureRandom())

    return OkHttpClient.Builder()
      .sslSocketFactory(sslContext.socketFactory, trustAll)
      .hostnameVerifier { _, _ -> true }
      .connectTimeout(8, TimeUnit.SECONDS)
      .readTimeout(8, TimeUnit.SECONDS)
      .build()
  }
}
