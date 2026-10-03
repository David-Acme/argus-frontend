package com.margelo.nitro.net

import android.os.Handler
import android.os.Looper
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.NullType
import java.util.ArrayDeque
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString

private const val PING_INTERVAL_MS = 20_000L

private sealed class SocketEvent {
  object Open : SocketEvent()
  class Text(val text: String) : SocketEvent()
  class Binary(val buffer: ArrayBuffer) : SocketEvent()
  class Failure(val code: String, val message: String) : SocketEvent()
  class Closed(val code: Int, val reason: String) : SocketEvent()
}

@DoNotStrip
class ArgusSocket(
  client: OkHttpClient,
  url: String,
  headers: Map<String, String>?,
  connectTimeoutMs: Double?,
) : HybridArgusSocketSpec() {

  override var onOpen: Variant_______Unit_NullType =
    Variant_______Unit_NullType.create(NullType.NULL)
    set(value) {
      field = value
      scheduleFlush()
    }
  override var onMessage: Variant__message__Variant_NullType_String___data__Variant_NullType_ArrayBuffer______Unit_NullType =
    Variant__message__Variant_NullType_String___data__Variant_NullType_ArrayBuffer______Unit_NullType.create(
      NullType.NULL,
    )
    set(value) {
      field = value
      scheduleFlush()
    }
  override var onError: Variant__code__String__message__String_____Unit_NullType =
    Variant__code__String__message__String_____Unit_NullType.create(NullType.NULL)
    set(value) {
      field = value
      scheduleFlush()
    }
  override var onClose: Variant__code__Double__reason__String_____Unit_NullType =
    Variant__code__Double__reason__String_____Unit_NullType.create(NullType.NULL)
    set(value) {
      field = value
      scheduleFlush()
    }

  private val mainHandler = Handler(Looper.getMainLooper())
  private val pending = ArrayDeque<SocketEvent>()
  private var socket: WebSocket? = null

  private val listener = object : WebSocketListener() {
    override fun onOpen(webSocket: WebSocket, response: Response) {
      emit(SocketEvent.Open)
    }

    override fun onMessage(webSocket: WebSocket, text: String) {
      emit(SocketEvent.Text(text))
    }

    override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
      emit(SocketEvent.Binary(ArrayBuffer.copy(bytes.toByteArray())))
    }

    override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
      webSocket.close(code, reason)
    }

    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
      val code = if (response?.code == 401) "UNAUTHORIZED" else "NETWORK_ERROR"
      emit(SocketEvent.Failure(code, t.message ?: "Socket failure"))
    }

    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
      emit(SocketEvent.Closed(code, reason))
    }
  }

  init {
    val builder = client.newBuilder().pingInterval(PING_INTERVAL_MS, TimeUnit.MILLISECONDS)
    if (connectTimeoutMs != null) {
      builder.connectTimeout(connectTimeoutMs.toLong(), TimeUnit.MILLISECONDS)
    }
    val request = Request.Builder().url(url)
    headers?.forEach { (key, value) -> request.header(key, value) }
    socket = builder.build().newWebSocket(request.build(), listener)
  }

  private fun emit(event: SocketEvent) {
    mainHandler.post {
      pending.addLast(event)
      flush()
    }
  }

  private fun scheduleFlush() {
    mainHandler.post { flush() }
  }

  private fun flush() {
    while (true) {
      val event = pending.peekFirst() ?: return
      if (!deliver(event)) return
      pending.pollFirst()
    }
  }

  private fun deliver(event: SocketEvent): Boolean {
    when (event) {
      is SocketEvent.Open -> {
        val callback = onOpen.asFirstOrNull() ?: return false
        callback()
      }
      is SocketEvent.Text -> {
        val callback = onMessage.asFirstOrNull() ?: return false
        callback(Variant_NullType_String.create(event.text), Variant_NullType_ArrayBuffer.create(NullType.NULL))
      }
      is SocketEvent.Binary -> {
        val callback = onMessage.asFirstOrNull() ?: return false
        callback(Variant_NullType_String.create(NullType.NULL), Variant_NullType_ArrayBuffer.create(event.buffer))
      }
      is SocketEvent.Failure -> {
        val callback = onError.asFirstOrNull() ?: return false
        callback(event.code, event.message)
      }
      is SocketEvent.Closed -> {
        val callback = onClose.asFirstOrNull() ?: return false
        callback(event.code.toDouble(), event.reason)
      }
    }
    return true
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
