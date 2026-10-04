use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt};
use livekit_net::{
  Header, HttpClient, HttpMethod, HttpResponse, TransportError, WsClient, WsConnectResult, WsConnection,
};
use tokio::sync::Mutex;
use tokio_tungstenite::tungstenite::protocol::Message;

use crate::net::socket::{connect_pinned, PinnedConnect, PinnedStream};

type Writer = SplitSink<PinnedStream, Message>;
type Reader = SplitStream<PinnedStream>;

const MIN_CONNECT_TIMEOUT: Duration = Duration::from_secs(1);

pub struct PinnedTransport;

struct PinnedConnection {
  writer: Mutex<Writer>,
  reader: Mutex<Reader>,
}

fn transport_error(message: String) -> TransportError {
  if message.starts_with("TIMEOUT|") || message.contains("timeout") {
    TransportError::Timeout
  } else {
    TransportError::Connection(message)
  }
}

pub fn header_map(headers: &[Header]) -> HashMap<String, String> {
  headers.iter().map(|header| (header.name.clone(), header.value.clone())).collect()
}

#[async_trait::async_trait]
impl WsConnection for PinnedConnection {
  async fn send(&self, frame: Vec<u8>) -> Result<(), TransportError> {
    self
      .writer
      .lock()
      .await
      .send(Message::Binary(frame.into()))
      .await
      .map_err(|error| TransportError::Connection(error.to_string()))
  }

  async fn recv(&self) -> Result<Option<Vec<u8>>, TransportError> {
    let mut reader = self.reader.lock().await;
    loop {
      match reader.next().await {
        Some(Ok(Message::Binary(data))) => return Ok(Some(data.to_vec())),
        Some(Ok(Message::Text(text))) => return Ok(Some(text.as_bytes().to_vec())),
        Some(Ok(Message::Ping(data))) => {
          let _ = self.writer.lock().await.send(Message::Pong(data)).await;
        }
        Some(Ok(Message::Pong(_) | Message::Frame(_))) => {}
        Some(Ok(Message::Close(_))) | None => return Ok(None),
        Some(Err(error)) => return Err(TransportError::Connection(error.to_string())),
      }
    }
  }

  async fn close(&self) {
    let _ = self.writer.lock().await.close().await;
  }
}

#[async_trait::async_trait]
impl WsClient for PinnedTransport {
  async fn connect(
    &self,
    url: String,
    headers: Vec<Header>,
    timeout_ms: u64,
  ) -> Result<WsConnectResult, TransportError> {
    let headers = header_map(&headers);
    let timeout = Duration::from_millis(timeout_ms).max(MIN_CONNECT_TIMEOUT);
    let stream = connect_pinned(PinnedConnect { url: &url, headers: &headers, timeout, identify: false })
      .await
      .map_err(transport_error)?;
    let (writer, reader) = stream.split();
    Ok(WsConnectResult {
      connection: Arc::new(PinnedConnection { writer: Mutex::new(writer), reader: Mutex::new(reader) }),
    })
  }
}

#[async_trait::async_trait]
impl HttpClient for PinnedTransport {
  async fn request(
    &self,
    method: HttpMethod,
    url: String,
    headers: Vec<Header>,
    body: Option<Vec<u8>>,
  ) -> Result<HttpResponse, TransportError> {
    let trust = tauri::async_runtime::spawn_blocking(crate::net::trust::paired)
      .await
      .map_err(|error| TransportError::Other(error.to_string()))?
      .map_err(TransportError::Connection)?;
    let client = crate::net::http::pinned_client(&url, &trust).map_err(TransportError::Connection)?;
    let mut builder = match method {
      HttpMethod::Get => client.get(&url),
      HttpMethod::Post => client.post(&url),
    };
    for header in &headers {
      builder = builder.header(&header.name, &header.value);
    }
    if let Some(body) = body {
      builder = builder.body(body);
    }
    let response = builder.send().await.map_err(|error| transport_error(crate::net::http::request_error(error)))?;
    let status = response.status().as_u16();
    let headers = response
      .headers()
      .iter()
      .filter_map(|(name, value)| {
        value.to_str().ok().map(|value| Header { name: name.as_str().to_string(), value: value.to_string() })
      })
      .collect();
    let body = response
      .bytes()
      .await
      .map_err(|error| TransportError::Other(error.to_string()))?
      .to_vec();
    Ok(HttpResponse { status, headers, body })
  }
}

pub fn install() {
  livekit_net::set_ws_client(Arc::new(PinnedTransport));
  livekit_net::set_http_client(Arc::new(PinnedTransport));
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn refusal_codes_map_to_transport_errors() {
    assert!(matches!(transport_error("TIMEOUT|slow".into()), TransportError::Timeout));
    assert!(matches!(
      transport_error("NETWORK_ERROR|WebSocket handshake timeout".into()),
      TransportError::Timeout
    ));
    assert!(matches!(
      transport_error("HOST_NOT_ALLOWED|Host is not allowed".into()),
      TransportError::Connection(message) if message.starts_with("HOST_NOT_ALLOWED")
    ));
  }

  #[test]
  fn headers_keep_the_bearer() {
    let map = header_map(&[Header { name: "Authorization".into(), value: "Bearer t".into() }]);
    assert_eq!(map.get("Authorization").map(String::as_str), Some("Bearer t"));
  }
}
