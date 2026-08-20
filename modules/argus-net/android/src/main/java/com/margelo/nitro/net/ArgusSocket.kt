package com.margelo.nitro.net

import android.os.Handler
import android.os.Looper
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.NullType
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString

@DoNotStrip
class ArgusSocket(
  client: OkHttpClient,
  url: String,
  headers: Map<String, String>?,
  connectTimeoutMs: Double?,
) : HybridArgusSocketSpec() {

  override var onOpen: Variant_______Unit_NullType =
    Variant_______Unit_NullType.create(NullType.NULL)
  override var onMessage: Variant__message__Variant_NullType_String___data__Variant_NullType_ArrayBuffer______Unit_NullType =
    Variant__message__Variant_NullType_String___data__Variant_NullType_ArrayBuffer______Unit_NullType.create(
      NullType.NULL,
    )
  override var onError: Variant__code__String__message__String_____Unit_NullType =
    Variant__code__String__message__String_____Unit_NullType.create(NullType.NULL)
  override var onClose: Variant__code__Double__reason__String_____Unit_NullType =
    Variant__code__Double__reason__String_____Unit_NullType.create(NullType.NULL)

  private val mainHandler = Handler(Looper.getMainLooper())
  private var socket: WebSocket? = null

  private val listener = object : WebSocketListener() {
    override fun onOpen(webSocket: WebSocket, response: Response) {
      mainHandler.post { onOpen.asFirstOrNull()?.invoke() }
    }

    override fun onMessage(webSocket: WebSocket, text: String) {
      mainHandler.post {
        onMessage.asFirstOrNull()
          ?.invoke(Variant_NullType_String.create(text), Variant_NullType_ArrayBuffer.create(NullType.NULL))
      }
    }

    override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
      val buffer = ArrayBuffer.copy(bytes.toByteArray())
      mainHandler.post {
        onMessage.asFirstOrNull()
          ?.invoke(Variant_NullType_String.create(NullType.NULL), Variant_NullType_ArrayBuffer.create(buffer))
      }
    }

    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
      val code = if (response?.code == 401) "UNAUTHORIZED" else "NETWORK_ERROR"
      mainHandler.post { onError.asFirstOrNull()?.invoke(code, t.message ?: "Socket failure") }
    }

    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
      mainHandler.post { onClose.asFirstOrNull()?.invoke(code.toDouble(), reason) }
    }
  }

  init {
    val effectiveClient = if (connectTimeoutMs != null) {
      client.newBuilder()
        .connectTimeout(connectTimeoutMs.toLong(), TimeUnit.MILLISECONDS)
        .build()
    } else {
      client
    }
    val builder = Request.Builder().url(url)
    headers?.forEach { (key, value) -> builder.header(key, value) }
    socket = effectiveClient.newWebSocket(builder.build(), listener)
  }

  override fun sendText(message: String) {
    socket?.send(message)
  }

  override fun sendBinary(data: ArrayBuffer) {
    socket?.send(ByteString.of(*data.toByteArray()))
  }

  override fun close(code: Double?, reason: String?) {
    socket?.close(code?.toInt() ?: 1000, reason ?: "")
  }
}
