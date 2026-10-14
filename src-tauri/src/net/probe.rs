use std::io::{Cursor, Read, Write};
use std::net::{IpAddr, SocketAddr, TcpStream, ToSocketAddrs};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
use rustls::client::WebPkiServerVerifier;
use rustls::pki_types::{CertificateDer, ServerName, UnixTime};
use rustls::{ClientConfig, ClientConnection, DigitallySignedStruct, RootCertStore, SignatureScheme};
use serde::Serialize;
use sha2::{Digest, Sha256};

use super::identity;
use super::trust::Trust;

const MIN_WAIT: Duration = Duration::from_millis(1);
const STATUS_PREFIX: &[u8] = b"HTTP/1.";

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ProbeOutcome {
  Reached,
  Dns,
  Connect,
  TlsPeerClosed,
  Pin,
}

impl ProbeOutcome {
  pub fn as_str(self) -> &'static str {
    match self {
      Self::Reached => "reached",
      Self::Dns => "dns",
      Self::Connect => "connect",
      Self::TlsPeerClosed => "tls-peer-closed",
      Self::Pin => "pin",
    }
  }
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProbeReply {
  pub outcome: &'static str,
  pub address: String,
  pub fingerprint: String,
}

pub struct ProbeTarget<'a> {
  pub url: &'a str,
  pub timeout: Duration,
}

struct Endpoint {
  host: String,
  port: u16,
  path: String,
}

fn endpoint(url: &str) -> Result<Endpoint, String> {
  let parsed = url::Url::parse(url).map_err(|error| format!("NETWORK_ERROR|Invalid probe URL: {error}"))?;
  if parsed.scheme() != "https" {
    return Err("HOST_NOT_ALLOWED|A probe goes over https only".to_string());
  }
  let host = parsed
    .host_str()
    .ok_or_else(|| "NETWORK_ERROR|The probe URL has no host".to_string())?
    .to_lowercase();
  let port = parsed.port_or_known_default().unwrap_or(443);
  let path = match parsed.query() {
    Some(query) => format!("{}?{query}", parsed.path()),
    None => parsed.path().to_string(),
  };
  Ok(Endpoint { host, port, path })
}

fn resolve(endpoint: &Endpoint, trust: &Trust) -> Option<SocketAddr> {
  if endpoint.host.eq_ignore_ascii_case(&trust.host) {
    return trust.ip.parse::<IpAddr>().ok().map(|ip| SocketAddr::new(ip, endpoint.port));
  }
  (endpoint.host.as_str(), endpoint.port).to_socket_addrs().ok()?.next()
}

fn left(deadline: Instant) -> Duration {
  deadline.saturating_duration_since(Instant::now()).max(MIN_WAIT)
}

pub fn fingerprint(der: &[u8]) -> String {
  Sha256::digest(der).iter().map(|byte| format!("{byte:02X}")).collect()
}

#[derive(Debug)]
struct Witness {
  inner: Arc<WebPkiServerVerifier>,
  seen: Mutex<Option<Vec<u8>>>,
  refused: AtomicBool,
}

impl Witness {
  fn seen(&self) -> String {
    self
      .seen
      .lock()
      .ok()
      .and_then(|seen| seen.as_deref().map(fingerprint))
      .unwrap_or_default()
  }
}

impl ServerCertVerifier for Witness {
  fn verify_server_cert(
    &self,
    end_entity: &CertificateDer<'_>,
    intermediates: &[CertificateDer<'_>],
    server_name: &ServerName<'_>,
    ocsp_response: &[u8],
    now: UnixTime,
  ) -> Result<ServerCertVerified, rustls::Error> {
    if let Ok(mut seen) = self.seen.lock() {
      *seen = Some(end_entity.as_ref().to_vec());
    }
    let verdict = self
      .inner
      .verify_server_cert(end_entity, intermediates, server_name, ocsp_response, now);
    if verdict.is_err() {
      self.refused.store(true, Ordering::Release);
    }
    verdict
  }

  fn verify_tls12_signature(
    &self,
    message: &[u8],
    cert: &CertificateDer<'_>,
    dss: &DigitallySignedStruct,
  ) -> Result<HandshakeSignatureValid, rustls::Error> {
    self.inner.verify_tls12_signature(message, cert, dss)
  }

  fn verify_tls13_signature(
    &self,
    message: &[u8],
    cert: &CertificateDer<'_>,
    dss: &DigitallySignedStruct,
  ) -> Result<HandshakeSignatureValid, rustls::Error> {
    self.inner.verify_tls13_signature(message, cert, dss)
  }

  fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
    self.inner.supported_verify_schemes()
  }
}

fn witness(ca_pem: &str) -> Result<Arc<Witness>, String> {
  let mut roots = RootCertStore::empty();
  for cert in rustls_pemfile::certs(&mut Cursor::new(ca_pem.as_bytes())) {
    let cert = cert.map_err(|error| format!("CERT_NOT_TRUSTED|Invalid CA certificate: {error}"))?;
    roots
      .add(cert)
      .map_err(|error| format!("CERT_NOT_TRUSTED|Invalid CA certificate: {error}"))?;
  }
  let provider = Arc::new(rustls::crypto::ring::default_provider());
  let inner = WebPkiServerVerifier::builder_with_provider(Arc::new(roots), provider)
    .build()
    .map_err(|error| format!("CERT_NOT_TRUSTED|Invalid CA certificate: {error}"))?;
  Ok(Arc::new(Witness {
    inner,
    seen: Mutex::new(None),
    refused: AtomicBool::new(false),
  }))
}

fn request_bytes(endpoint: &Endpoint) -> Vec<u8> {
  let authority = if endpoint.port == 443 {
    endpoint.host.clone()
  } else {
    format!("{}:{}", endpoint.host, endpoint.port)
  };
  let mut request = format!(
    "GET {} HTTP/1.1\r\nHost: {authority}\r\nAccept: application/json\r\nConnection: close\r\n",
    endpoint.path
  );
  for (name, value) in identity::headers() {
    if let Ok(value) = value.to_str() {
      request.push_str(&format!("{name}: {value}\r\n"));
    }
  }
  request.push_str("\r\n");
  request.into_bytes()
}

fn answered(stream: &mut impl Read) -> bool {
  let mut head = Vec::with_capacity(STATUS_PREFIX.len());
  let mut chunk = [0u8; 64];
  while head.len() < STATUS_PREFIX.len() {
    match stream.read(&mut chunk) {
      Ok(0) | Err(_) => return false,
      Ok(read) => head.extend_from_slice(&chunk[..read]),
    }
  }
  head.starts_with(STATUS_PREFIX)
}

fn exchange(connection: &mut ClientConnection, socket: &mut TcpStream, request: &[u8]) -> ProbeOutcome {
  let mut stream = rustls::Stream::new(connection, socket);
  if stream.write_all(request).and_then(|()| stream.flush()).is_err() {
    return ProbeOutcome::TlsPeerClosed;
  }
  if answered(&mut stream) {
    ProbeOutcome::Reached
  } else {
    ProbeOutcome::TlsPeerClosed
  }
}

fn reply(outcome: ProbeOutcome, address: Option<SocketAddr>, fingerprint: String) -> ProbeReply {
  ProbeReply {
    outcome: outcome.as_str(),
    address: address.map(|address| address.to_string()).unwrap_or_default(),
    fingerprint,
  }
}

pub fn probe(target: &ProbeTarget<'_>, trust: &Trust) -> Result<ProbeReply, String> {
  let endpoint = endpoint(target.url)?;
  if !trust.admits(&endpoint.host) {
    return Err("HOST_NOT_ALLOWED|Host is not allowed".to_string());
  }
  let deadline = Instant::now() + target.timeout;
  let Some(address) = resolve(&endpoint, trust) else {
    return Ok(reply(ProbeOutcome::Dns, None, String::new()));
  };
  let Ok(mut socket) = TcpStream::connect_timeout(&address, left(deadline)) else {
    return Ok(reply(ProbeOutcome::Connect, Some(address), String::new()));
  };
  let witness = witness(&trust.ca_pem)?;
  let config = ClientConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
    .with_safe_default_protocol_versions()
    .map_err(|error| format!("NETWORK_ERROR|{error}"))?
    .dangerous()
    .with_custom_certificate_verifier(witness.clone())
    .with_no_client_auth();
  let name = ServerName::try_from(endpoint.host.clone())
    .map_err(|_| "HOST_NOT_ALLOWED|Host is not allowed".to_string())?;
  let mut connection =
    ClientConnection::new(Arc::new(config), name).map_err(|error| format!("NETWORK_ERROR|{error}"))?;
  let wait = Some(left(deadline));
  if socket.set_read_timeout(wait).is_err() || socket.set_write_timeout(wait).is_err() {
    return Ok(reply(ProbeOutcome::TlsPeerClosed, Some(address), String::new()));
  }
  let outcome = exchange(&mut connection, &mut socket, &request_bytes(&endpoint));
  if witness.refused.load(Ordering::Acquire) {
    return Ok(reply(ProbeOutcome::Pin, Some(address), witness.seen()));
  }
  Ok(reply(outcome, Some(address), String::new()))
}

#[cfg(test)]
mod tests {
  use std::net::TcpListener;
  use std::time::Duration;

  use super::super::relay::RemoteProfile;
  use super::super::test_tls::{credential_free, pem_fingerprint, serve, Behaviour, Vectors};
  use super::super::trust::Trust;
  use super::{probe, ProbeTarget};

  const TIMEOUT: Duration = Duration::from_millis(1500);

  fn trust(vectors: &Vectors, domain: &str) -> Trust {
    Trust {
      ca_pem: vectors.ca.clone(),
      host: vectors.lan_host.clone(),
      ip: "127.0.0.1".to_string(),
      remote: Some(RemoteProfile {
        home_id: vectors.home_id.clone(),
        domain: domain.to_string(),
      }),
    }
  }

  fn outcome_at(port: u16, timeout: Duration) -> (&'static str, String) {
    let vectors = Vectors::load();
    let url = format!("https://{}:{port}/pairing/status", vectors.lan_host);
    let reply = probe(&ProbeTarget { url: &url, timeout }, &trust(&vectors, &vectors.domain)).expect("a probe reply");
    (reply.outcome, reply.fingerprint)
  }

  #[test]
  fn a_home_under_the_pinned_ca_is_reached_and_hears_no_credential() {
    let vectors = Vectors::load();
    let server = serve(&vectors.home, Behaviour::Answer);
    let (outcome, _) = outcome_at(server.port, TIMEOUT);
    let seen = server.finish();
    assert_eq!(outcome, "reached");
    assert!(seen.plaintext.starts_with(b"GET /pairing/status HTTP/1.1\r\n"));
    assert!(credential_free(&seen.plaintext), "{}", String::from_utf8_lossy(&seen.plaintext));
  }

  #[test]
  fn a_certificate_from_another_ca_is_a_pin_failure_and_nothing_crosses_it() {
    let vectors = Vectors::load();
    let server = serve(&vectors.rogue, Behaviour::Answer);
    let (outcome, fingerprint) = outcome_at(server.port, TIMEOUT);
    let seen = server.finish();
    assert_eq!(outcome, "pin");
    assert_eq!(fingerprint, pem_fingerprint(&vectors.rogue.cert));
    assert!(seen.plaintext.is_empty());
  }

  #[test]
  fn a_certificate_for_another_name_is_a_pin_failure() {
    let vectors = Vectors::load();
    let server = serve(&vectors.misnamed, Behaviour::Answer);
    let (outcome, fingerprint) = outcome_at(server.port, TIMEOUT);
    server.finish();
    assert_eq!(outcome, "pin");
    assert_eq!(fingerprint, pem_fingerprint(&vectors.misnamed.cert));
  }

  #[test]
  fn a_peer_that_closes_during_the_handshake_is_tls_peer_closed() {
    let vectors = Vectors::load();
    let server = serve(&vectors.home, Behaviour::Close);
    let (outcome, _) = outcome_at(server.port, TIMEOUT);
    server.finish();
    assert_eq!(outcome, "tls-peer-closed");
  }

  #[test]
  fn a_peer_that_connects_and_stays_silent_is_tls_peer_closed() {
    let vectors = Vectors::load();
    let server = serve(&vectors.home, Behaviour::Silent);
    let (outcome, _) = outcome_at(server.port, Duration::from_millis(300));
    server.finish();
    assert_eq!(outcome, "tls-peer-closed");
  }

  #[test]
  fn a_refused_tcp_connection_is_connect() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("a free port");
    let port = listener.local_addr().expect("an address").port();
    drop(listener);
    assert_eq!(outcome_at(port, TIMEOUT).0, "connect");
  }

  #[test]
  fn a_device_name_that_does_not_resolve_is_dns() {
    let vectors = Vectors::load();
    let url = format!("https://identity--{}.argus.invalid/pairing/status", vectors.home_id);
    let reply = probe(&ProbeTarget { url: &url, timeout: TIMEOUT }, &trust(&vectors, "argus.invalid")).expect("a reply");
    assert_eq!(reply.outcome, "dns");
    assert!(reply.address.is_empty());
  }

  #[test]
  fn a_name_the_home_does_not_own_is_refused_before_any_connection() {
    let vectors = Vectors::load();
    let target = ProbeTarget { url: "https://argus.example/pairing/status", timeout: TIMEOUT };
    let error = probe(&target, &trust(&vectors, &vectors.domain)).expect_err("a refusal");
    assert!(error.starts_with("HOST_NOT_ALLOWED|"));
  }
}
