use std::collections::HashMap;
use std::io::Cursor;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use futures_util::{SinkExt, StreamExt};
use rustls::pki_types::CertificateDer;
use serde::Deserialize;
use tauri::ipc::{Channel, InvokeBody, InvokeResponseBody, Request};
use tauri::State;
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::protocol::Message;
use tokio_tungstenite::{client_async_tls_with_config, Connector};

use super::trust::Trust;

type SocketSender = mpsc::Sender<Message>;
type SocketMap = Arc<Mutex<HashMap<String, SocketSender>>>;
type SocketChannel = Channel;

const FRAME_OPEN: u8 = 0;
const FRAME_TEXT: u8 = 1;
const FRAME_BINARY: u8 = 2;
const FRAME_ERROR: u8 = 3;
const FRAME_CLOSE: u8 = 4;
const PING_INTERVAL: Duration = Duration::from_secs(20);
const PEER_SILENCE_LIMIT: Duration = Duration::from_secs(45);
const WRITE_TIMEOUT: Duration = Duration::from_secs(10);
const SEND_QUEUE: usize = 512;
const CONNECT_TIMEOUT_MIN_MS: f64 = 1_000.0;
const CONNECT_TIMEOUT_MAX_MS: f64 = 60_000.0;

#[derive(Clone, Default)]
pub struct SocketState {
  pub sockets: SocketMap,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SocketOpenOptions {
  pub socket_id: String,
  pub url: String,
  pub headers: HashMap<String, String>,
  pub connect_timeout_ms: f64,
}

fn send_frame(channel: &SocketChannel, kind: u8, payload: &[u8]) -> bool {
  let mut frame = Vec::with_capacity(payload.len() + 1);
  frame.push(kind);
  frame.extend_from_slice(payload);
  channel.send(InvokeResponseBody::Raw(frame)).is_ok()
}

fn send_text_frame(channel: &SocketChannel, kind: u8, text: &str) -> bool {
  send_frame(channel, kind, text.as_bytes())
}

fn enqueue(sender: &SocketSender, message: Message) -> Result<(), String> {
  sender.try_send(message).map_err(|error| match error {
    mpsc::error::TrySendError::Full(_) => "NETWORK_ERROR|Socket send queue is full".to_string(),
    mpsc::error::TrySendError::Closed(_) => "NETWORK_ERROR|Socket is closed".to_string(),
  })
}

fn connect_timeout(requested_ms: f64) -> Duration {
  let ms = if requested_ms.is_finite() {
    requested_ms.clamp(CONNECT_TIMEOUT_MIN_MS, CONNECT_TIMEOUT_MAX_MS)
  } else {
    CONNECT_TIMEOUT_MIN_MS
  };
  Duration::from_millis(ms as u64)
}

fn send_close_frame(channel: &SocketChannel, code: i32, reason: &str) {
  let mut frame = Vec::with_capacity(reason.len() + 5);
  frame.push(FRAME_CLOSE);
  frame.extend_from_slice(&(code as u32).to_be_bytes());
  frame.extend_from_slice(reason.as_bytes());
  let _ = channel.send(InvokeResponseBody::Raw(frame));
}

fn parse_error(error: impl std::fmt::Display) -> String {
  format!("NETWORK_ERROR|{error}")
}

fn build_tls_config(ca_pem: &str) -> Result<rustls::ClientConfig, String> {
  if ca_pem.is_empty() {
    return Err("PAIRING_REQUIRED|Server is not paired yet".to_string());
  }

  let mut reader = Cursor::new(ca_pem.as_bytes());
  let certs: Vec<CertificateDer<'static>> = rustls_pemfile::certs(&mut reader)
    .collect::<Result<Vec<_>, _>>()
    .map_err(|error| format!("CERT_NOT_TRUSTED|Invalid CA certificate: {error}"))?;
  if certs.is_empty() {
    return Err("CERT_NOT_TRUSTED|CA certificate is empty".to_string());
  }

  let mut roots = rustls::RootCertStore::empty();
  for cert in certs {
    roots
      .add(cert)
      .map_err(|error| format!("CERT_NOT_TRUSTED|Invalid CA certificate: {error}"))?;
  }

  Ok(rustls::ClientConfig::builder()
    .with_root_certificates(roots)
    .with_no_client_auth())
}

fn validate_target(options: &SocketOpenOptions, trust: &Trust) -> Result<(url::Url, SocketAddr), String> {
  let url = url::Url::parse(&options.url)
    .map_err(|error| format!("NETWORK_ERROR|Invalid WebSocket URL: {error}"))?;
  let host = url
    .host_str()
    .ok_or_else(|| "NETWORK_ERROR|WebSocket URL has no host".to_string())?;
  if host.to_lowercase() != trust.host.to_lowercase() {
    return Err("HOST_NOT_ALLOWED|Host is not allowed".to_string());
  }
  if url.scheme() != "wss" {
    return Err("CERT_NOT_TRUSTED|Only wss sockets are allowed".to_string());
  }
  let port = url
    .port_or_known_default()
    .ok_or_else(|| "NETWORK_ERROR|WebSocket URL has no port".to_string())?;
  let ip = trust
    .ip
    .parse()
    .map_err(|error| format!("NETWORK_ERROR|Invalid paired IP: {error}"))?;
  Ok((url, SocketAddr::new(ip, port)))
}

pub async fn open(
  state: State<'_, SocketState>,
  options: SocketOpenOptions,
  on_event: SocketChannel,
) -> Result<(), String> {
  let trust = super::trust::paired()?;
  let (url, address) = validate_target(&options, &trust)?;
  let tls = build_tls_config(&trust.ca_pem)?;
  let timeout = connect_timeout(options.connect_timeout_ms);

  let stream = tokio::time::timeout(timeout, TcpStream::connect(address))
    .await
    .map_err(|_| "NETWORK_ERROR|WebSocket connection timeout".to_string())?
    .map_err(parse_error)?;

  let mut request = url
    .as_str()
    .into_client_request()
    .map_err(parse_error)?;
  for (key, value) in &options.headers {
    let name = http::header::HeaderName::try_from(key)
      .map_err(|error| format!("NETWORK_ERROR|Invalid header name: {error}"))?;
    let value = http::header::HeaderValue::try_from(value)
      .map_err(|error| format!("NETWORK_ERROR|Invalid header value: {error}"))?;
    request.headers_mut().insert(name, value);
  }
  super::identity::apply(request.headers_mut());

  let connector = Connector::Rustls(Arc::new(tls));
  let handshake = tokio::time::timeout(
    timeout,
    client_async_tls_with_config(request, stream, None, Some(connector)),
  )
  .await
  .map_err(|_| "NETWORK_ERROR|WebSocket handshake timeout".to_string())?;

  let (socket, _) = handshake.map_err(|error| match error {
    tokio_tungstenite::tungstenite::Error::Http(response) if response.status() == 401 => {
      "UNAUTHORIZED|WebSocket authorization failed".to_string()
    }
    error => parse_error(error),
  })?;

  let (mut writer, mut reader) = socket.split();
  let (sender, mut receiver) = mpsc::channel::<Message>(SEND_QUEUE);
  state.sockets.lock().map_err(|_| "NETWORK_ERROR|Socket state poisoned".to_string())?
    .insert(options.socket_id.clone(), sender);

  send_frame(&on_event, FRAME_OPEN, &[]);

  let socket_id = options.socket_id.clone();
  let sockets = state.sockets.clone();
  tokio::spawn(async move {
    let mut close_code = 1000;
    let mut close_reason = String::new();
    let mut last_heard = Instant::now();
    let mut ping = tokio::time::interval_at(tokio::time::Instant::now() + PING_INTERVAL, PING_INTERVAL);
    loop {
      tokio::select! {
        _ = ping.tick() => {
          if last_heard.elapsed() > PEER_SILENCE_LIMIT {
            close_code = 1006;
            close_reason = "Peer stopped answering".to_string();
            break;
          }
          if !matches!(tokio::time::timeout(WRITE_TIMEOUT, writer.send(Message::Ping(Default::default()))).await, Ok(Ok(()))) {
            close_code = 1006;
            close_reason = "Ping failed".to_string();
            break;
          }
        }
        outgoing = receiver.recv() => {
          match outgoing {
            Some(message) => {
              if !matches!(tokio::time::timeout(WRITE_TIMEOUT, writer.send(message)).await, Ok(Ok(()))) {
                close_code = 1006;
                close_reason = "Write failed".to_string();
                break;
              }
            }
            None => break,
          }
        }
        incoming = reader.next() => {
          if matches!(incoming, Some(Ok(_))) {
            last_heard = Instant::now();
          }
          let delivered = match incoming {
            Some(Ok(Message::Text(message))) => send_text_frame(&on_event, FRAME_TEXT, &message),
            Some(Ok(Message::Binary(data))) => send_frame(&on_event, FRAME_BINARY, &data),
            Some(Ok(Message::Close(frame))) => {
              if let Some(frame) = frame {
                close_code = i32::from(u16::from(frame.code));
                close_reason = frame.reason.to_string();
              }
              break;
            }
            Some(Ok(Message::Ping(data))) => {
              let _ = tokio::time::timeout(WRITE_TIMEOUT, writer.send(Message::Pong(data))).await;
              true
            }
            Some(Ok(Message::Pong(_) | Message::Frame(_))) => true,
            Some(Err(error)) => {
              send_text_frame(&on_event, FRAME_ERROR, &format!("NETWORK_ERROR|{error}"));
              close_code = 1006;
              close_reason = error.to_string();
              break;
            }
            None => break,
          };
          if !delivered {
            close_code = 1001;
            close_reason = "Listener is gone".to_string();
            break;
          }
        }
      }
    }
    if let Ok(mut sockets) = sockets.lock() {
      sockets.remove(&socket_id);
    }
    send_close_frame(&on_event, close_code, &close_reason);
  });

  Ok(())
}

pub fn send_text(state: State<'_, SocketState>, socket_id: String, message: String) -> Result<(), String> {
  let sockets = state.sockets.lock().map_err(|_| "NETWORK_ERROR|Socket state poisoned".to_string())?;
  let sender = sockets.get(&socket_id).ok_or_else(|| "NETWORK_ERROR|Socket is closed".to_string())?;
  enqueue(sender, Message::Text(message.into()))
}

pub fn send_binary(request: Request<'_>, state: State<'_, SocketState>) -> Result<(), String> {
  let socket_id = request
    .headers()
    .get("x-argus-socket-id")
    .and_then(|value| value.to_str().ok())
    .ok_or_else(|| "NETWORK_ERROR|Missing socket id".to_string())?
    .to_string();
  let InvokeBody::Raw(bytes) = request.body() else {
    return Err("NETWORK_ERROR|Binary body required".to_string());
  };
  let sockets = state.sockets.lock().map_err(|_| "NETWORK_ERROR|Socket state poisoned".to_string())?;
  let sender = sockets.get(&socket_id).ok_or_else(|| "NETWORK_ERROR|Socket is closed".to_string())?;
  enqueue(sender, Message::Binary(bytes.clone().into()))
}

pub fn close(state: State<'_, SocketState>, socket_id: String, code: f64, reason: String) -> Result<(), String> {
  let sender = state.sockets.lock()
    .map_err(|_| "NETWORK_ERROR|Socket state poisoned".to_string())?
    .remove(&socket_id);
  if let Some(sender) = sender {
    let code = tokio_tungstenite::tungstenite::protocol::frame::coding::CloseCode::from(code as u16);
    let frame = tokio_tungstenite::tungstenite::protocol::CloseFrame { code, reason: reason.into() };
    let _ = sender.try_send(Message::Close(Some(frame)));
  }
  Ok(())
}
