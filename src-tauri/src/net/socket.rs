use std::collections::HashMap;
use std::io::Cursor;
use std::net::SocketAddr;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use futures_util::{SinkExt, StreamExt};
use rustls::pki_types::CertificateDer;
use serde::Deserialize;
use tauri::ipc::{Channel, InvokeBody, InvokeResponseBody, Request};
use tauri::{AppHandle, State};
use tokio::net::TcpStream;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::protocol::Message;
use tokio_tungstenite::{client_async_tls_with_config, Connector, MaybeTlsStream, WebSocketStream};

use super::trust::Trust;
use crate::sync_link;

type SocketSender = mpsc::Sender<Message>;
type SocketMap = Arc<Mutex<HashMap<String, SocketSender>>>;
type SocketChannel = Channel;
pub type PinnedStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

pub struct PinnedConnect<'a> {
  pub url: &'a str,
  pub headers: &'a HashMap<String, String>,
  pub timeout: Duration,
  pub identify: bool,
}

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

#[derive(Clone, Copy)]
struct SocketTimings {
  ping: Duration,
  silence: Duration,
}

const DEFAULT_TIMINGS: SocketTimings = SocketTimings {
  ping: PING_INTERVAL,
  silence: PEER_SILENCE_LIMIT,
};

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

#[derive(Debug, PartialEq, Eq)]
enum SocketAddress {
  Paired(SocketAddr),
  Relay(String, u16),
}

fn validate_target(target: &str, trust: &Trust) -> Result<(url::Url, SocketAddress), String> {
  let url = url::Url::parse(target)
    .map_err(|error| format!("NETWORK_ERROR|Invalid WebSocket URL: {error}"))?;
  let host = url
    .host_str()
    .ok_or_else(|| "NETWORK_ERROR|WebSocket URL has no host".to_string())?
    .to_lowercase();
  if !trust.admits(&host) {
    return Err("HOST_NOT_ALLOWED|Host is not allowed".to_string());
  }
  if url.scheme() != "wss" {
    return Err("CERT_NOT_TRUSTED|Only wss sockets are allowed".to_string());
  }
  let port = url
    .port_or_known_default()
    .ok_or_else(|| "NETWORK_ERROR|WebSocket URL has no port".to_string())?;
  if trust.is_relay(&host) {
    return Ok((url, SocketAddress::Relay(host, port)));
  }
  let ip = trust
    .ip
    .parse()
    .map_err(|error| format!("NETWORK_ERROR|Invalid paired IP: {error}"))?;
  Ok((url, SocketAddress::Paired(SocketAddr::new(ip, port))))
}

async fn connect_address(address: SocketAddress) -> std::io::Result<TcpStream> {
  match address {
    SocketAddress::Paired(address) => TcpStream::connect(address).await,
    SocketAddress::Relay(host, port) => TcpStream::connect((host.as_str(), port)).await,
  }
}

pub async fn connect_pinned(target: PinnedConnect<'_>) -> Result<PinnedStream, String> {
  let trust = super::trust::paired()?;
  let (url, address) = validate_target(target.url, &trust)?;
  let tls = build_tls_config(&trust.ca_pem)?;

  let stream = tokio::time::timeout(target.timeout, connect_address(address))
    .await
    .map_err(|_| "NETWORK_ERROR|WebSocket connection timeout".to_string())?
    .map_err(parse_error)?;

  let mut request = url
    .as_str()
    .into_client_request()
    .map_err(parse_error)?;
  for (key, value) in target.headers {
    let name = http::header::HeaderName::try_from(key)
      .map_err(|error| format!("NETWORK_ERROR|Invalid header name: {error}"))?;
    let value = http::header::HeaderValue::try_from(value)
      .map_err(|error| format!("NETWORK_ERROR|Invalid header value: {error}"))?;
    request.headers_mut().insert(name, value);
  }
  if target.identify {
    super::identity::apply(request.headers_mut());
  }

  let connector = Connector::Rustls(Arc::new(tls));
  let handshake = tokio::time::timeout(
    target.timeout,
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
  Ok(socket)
}

async fn pump<E>(
  socket: PinnedStream,
  mut receiver: mpsc::Receiver<Message>,
  mut emit: E,
  timings: SocketTimings,
) -> (i32, String)
where
  E: FnMut(u8, &[u8]) -> bool,
{
  let (mut writer, mut reader) = socket.split();
  let mut close_code = 1000;
  let mut close_reason = String::new();
  let mut last_heard = Instant::now();
  let mut ping =
    tokio::time::interval_at(tokio::time::Instant::now() + timings.ping, timings.ping);
  loop {
    tokio::select! {
      _ = ping.tick() => {
        if last_heard.elapsed() > timings.silence {
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
          Some(Ok(Message::Text(message))) => emit(FRAME_TEXT, message.as_bytes()),
          Some(Ok(Message::Binary(data))) => emit(FRAME_BINARY, &data),
          Some(Ok(Message::Close(frame))) => {
            if let Some(frame) = frame {
              close_code = i32::from(u16::from(frame.code));
              close_reason = frame.reason.to_string();
            }
            break;
          }
          Some(Ok(Message::Ping(data))) => {
            matches!(tokio::time::timeout(WRITE_TIMEOUT, writer.send(Message::Pong(data))).await, Ok(Ok(())))
          }
          Some(Ok(Message::Pong(_) | Message::Frame(_))) => true,
          Some(Err(error)) => {
            emit(FRAME_ERROR, format!("NETWORK_ERROR|{error}").as_bytes());
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
  (close_code, close_reason)
}

pub async fn open(
  app: AppHandle,
  state: State<'_, SocketState>,
  options: SocketOpenOptions,
  on_event: SocketChannel,
) -> Result<(), String> {
  let socket = connect_pinned(PinnedConnect {
    url: &options.url,
    headers: &options.headers,
    timeout: connect_timeout(options.connect_timeout_ms),
    identify: true,
  })
  .await?;

  let (sender, receiver) = mpsc::channel::<Message>(SEND_QUEUE);
  state.sockets.lock().map_err(|_| "NETWORK_ERROR|Socket state poisoned".to_string())?
    .insert(options.socket_id.clone(), sender.clone());

  send_frame(&on_event, FRAME_OPEN, &[]);

  let is_sync = sync_link::watches(&options.url);
  if is_sync {
    sync_link::opened(&app);
  }

  let socket_id = options.socket_id.clone();
  let sockets = state.sockets.clone();
  tokio::spawn(async move {
    let (close_code, close_reason) = pump(
      socket,
      receiver,
      |kind, payload| {
        if is_sync && kind == FRAME_TEXT {
          sync_link::on_frame(&app, payload);
        }
        send_frame(&on_event, kind, payload)
      },
      DEFAULT_TIMINGS,
    )
    .await;
    if let Ok(mut sockets) = sockets.lock() {
      sockets.remove(&socket_id);
    }
    if is_sync {
      sync_link::closed(&app);
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

#[cfg(test)]
mod tests {
  use std::sync::{Arc, Mutex};
  use std::time::Duration;

  use tokio::sync::mpsc;

  use super::super::relay::RemoteProfile;
  use super::super::trust::Trust;
  use super::{pump, validate_target, SocketAddress, SocketTimings};

  const HOME: &str = "0123456789abcdef0123456789abcdef";

  fn trust_with(remote: Option<RemoteProfile>) -> Trust {
    Trust {
      ca_pem: String::new(),
      host: "argus.local".to_string(),
      ip: "192.168.1.20".to_string(),
      remote,
    }
  }

  fn away() -> Trust {
    trust_with(Some(RemoteProfile {
      home_id: HOME.to_string(),
      domain: "argus-tunnel.lynk.page".to_string(),
    }))
  }

  #[test]
  fn the_paired_host_dials_the_paired_address() {
    let (_, address) = validate_target("wss://argus.local:7025/sync", &away()).expect("the paired host");
    assert_eq!(address, SocketAddress::Paired("192.168.1.20:7025".parse().expect("an address")));
  }

  #[test]
  fn a_device_name_dials_itself_through_the_relay() {
    let name = format!("sync--{HOME}.argus-tunnel.lynk.page");
    let (_, address) = validate_target(&format!("wss://{name}/sync"), &away()).expect("a device name");
    assert_eq!(address, SocketAddress::Relay(name, 443));
  }

  #[test]
  fn a_name_this_home_does_not_own_is_refused() {
    let refused = |url: &str, trust: &Trust| {
      validate_target(url, trust).is_err_and(|error| error.starts_with("HOST_NOT_ALLOWED|"))
    };
    assert!(refused(&format!("wss://sync--{HOME}.argus-tunnel.lynk.page/sync"), &trust_with(None)));
    assert!(refused("wss://sync--fedcba9876543210fedcba9876543210.argus-tunnel.lynk.page/sync", &away()));
    assert!(refused(&format!("wss://rtc--{HOME}.argus-tunnel.lynk.page/sync"), &away()));
    assert!(refused(&format!("wss://a.sync--{HOME}.argus-tunnel.lynk.page/sync"), &away()));
    assert!(refused("wss://argus-tunnel.lynk.page/sync", &away()));
  }

  #[tokio::test]
  async fn a_peer_that_stops_answering_is_closed_as_peer_silence() {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
      .await
      .expect("a free port");
    let address = listener.local_addr().expect("a bound address");
    let server = tokio::spawn(async move {
      let Ok((stream, _)) = listener.accept().await else {
        return;
      };
      let Ok(_socket) = tokio_tungstenite::accept_async(stream).await else {
        return;
      };
      std::future::pending::<()>().await;
    });

    let (stream, _) = tokio_tungstenite::connect_async(format!("ws://{address}/"))
      .await
      .expect("the WebSocket handshake");
    let (sender, receiver) = mpsc::channel(4);
    let frames: Arc<Mutex<Vec<(u8, Vec<u8>)>>> = Arc::new(Mutex::new(Vec::new()));
    let captured = frames.clone();

    let (code, reason) = pump(
      stream,
      receiver,
      move |kind, payload| {
        captured
          .lock()
          .expect("the frame list")
          .push((kind, payload.to_vec()));
        true
      },
      SocketTimings {
        ping: Duration::from_millis(40),
        silence: Duration::from_millis(100),
      },
    )
    .await;

    assert_eq!(code, 1006);
    assert_eq!(reason, "Peer stopped answering");
    assert!(frames.lock().expect("the frame list").is_empty());
    drop(sender);
    server.abort();
  }
}
