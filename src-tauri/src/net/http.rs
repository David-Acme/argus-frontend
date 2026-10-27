use std::collections::HashMap;
use std::error::Error as StdError;
use std::net::{IpAddr, SocketAddr};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use reqwest::dns::{Name, Resolve, Resolving};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::identity;
use super::trust::Trust;

const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const READ_TIMEOUT: Duration = Duration::from_secs(30);

static CLIENT_CACHE: OnceLock<Mutex<HashMap<String, reqwest::Client>>> = OnceLock::new();

#[derive(Clone)]
struct PinnedResolver {
  allowed_host: String,
  ip: Option<IpAddr>,
}

impl Resolve for PinnedResolver {
  fn resolve(&self, name: Name) -> Resolving {
    let host = name.as_str().to_lowercase();
    if host == self.allowed_host.to_lowercase() {
      if let Some(ip) = self.ip {
        let addr = SocketAddr::new(ip, 0);
        return Box::pin(async move {
          let addrs = std::iter::once(addr);
          Ok(Box::new(addrs) as Box<dyn Iterator<Item = SocketAddr> + Send>)
        });
      }
    }
    Box::pin(async move {
      let addrs = tokio::net::lookup_host((host.as_str(), 0)).await?.collect::<Vec<_>>();
      Ok(Box::new(addrs.into_iter()) as Box<dyn Iterator<Item = SocketAddr> + Send>)
    })
  }
}

fn is_certificate_error(error: &(dyn StdError + 'static)) -> bool {
  let mut current: Option<&(dyn StdError + 'static)> = Some(error);
  while let Some(cause) = current {
    if cause.downcast_ref::<rustls::Error>().is_some() {
      return true;
    }
    if let Some(inner) = cause.downcast_ref::<std::io::Error>().and_then(std::io::Error::get_ref) {
      if is_certificate_error(inner) {
        return true;
      }
    }
    current = cause.source();
  }
  false
}

pub fn request_error(error: reqwest::Error) -> String {
  let error = error.without_url();
  if is_certificate_error(&error) {
    return format!("CERT_NOT_TRUSTED|{error}");
  }
  if error.is_timeout() && !error.is_connect() {
    return format!("TIMEOUT|{error}");
  }
  format!("NETWORK_ERROR|{error}")
}

fn strict_client(ca_pem: &str, allowed_host: &str, ip: &str) -> Result<reqwest::Client, String> {
  let cache_key = format!("{ca_pem}|{allowed_host}|{ip}");
  let cache = CLIENT_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
  if let Some(client) = cache.lock().map_err(|e| format!("NETWORK_ERROR|{e}"))?.get(&cache_key) {
    return Ok(client.clone());
  }

  let cert = reqwest::tls::Certificate::from_pem(ca_pem.as_bytes())
    .map_err(|e| format!("CERT_NOT_TRUSTED|Invalid CA certificate: {e}"))?;
  let resolver = PinnedResolver {
    allowed_host: allowed_host.to_lowercase(),
    ip: ip.parse::<IpAddr>().ok(),
  };
  let client = reqwest::Client::builder()
    .tls_built_in_root_certs(false)
    .add_root_certificate(cert)
    .dns_resolver(Arc::new(resolver))
    .default_headers(identity::headers().clone())
    .https_only(true)
    .redirect(reqwest::redirect::Policy::none())
    .connect_timeout(CONNECT_TIMEOUT)
    .read_timeout(READ_TIMEOUT)
    .build()
    .map_err(|e| format!("NETWORK_ERROR|{e}"))?;

  cache
    .lock()
    .map_err(|e| format!("NETWORK_ERROR|{e}"))?
    .insert(cache_key, client.clone());
  Ok(client)
}

fn ensure_allowed_host(url: &str, trust: &Trust) -> Result<(), String> {
  let host = reqwest::Url::parse(url)
    .ok()
    .and_then(|u| u.host_str().map(str::to_lowercase))
    .unwrap_or_default();
  if host.is_empty() || !trust.admits(&host) {
    return Err("HOST_NOT_ALLOWED|Host is not allowed".to_string());
  }
  Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpRequest {
  pub url: String,
  pub method: String,
  pub headers: HashMap<String, String>,
  pub body: String,
  pub files: Vec<HttpFile>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpFile {
  pub name: String,
  pub uri: String,
  pub filename: String,
  pub content_type: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResult {
  pub status: f64,
  pub headers: HashMap<String, String>,
  pub body: String,
}

fn multipart_fields(form: reqwest::multipart::Form, body: &str) -> reqwest::multipart::Form {
  match serde_json::from_str::<Value>(body) {
    Ok(Value::Object(fields)) => fields.into_iter().fold(form, |form, (key, value)| {
      let text = match value {
        Value::String(text) => text,
        other => other.to_string(),
      };
      form.text(key, text)
    }),
    _ => form.text("payload", body.to_string()),
  }
}

fn inline_bytes(uri: &str) -> Option<Result<Vec<u8>, String>> {
  use base64::Engine as _;
  let rest = uri.strip_prefix("data:")?;
  let (_, payload) = rest.split_once(";base64,")?;
  Some(
    base64::engine::general_purpose::STANDARD
      .decode(payload)
      .map_err(|_| "STORAGE_ERROR|The attached file cannot be read".to_string()),
  )
}

async fn file_bytes(uri: &str) -> Result<Vec<u8>, String> {
  if let Some(bytes) = inline_bytes(uri) {
    return bytes;
  }
  tokio::fs::read(uri)
    .await
    .map_err(|_| "STORAGE_ERROR|The attached file cannot be read".to_string())
}

async fn multipart_form(request: &HttpRequest) -> Result<reqwest::multipart::Form, String> {
  let mut form = reqwest::multipart::Form::new();
  if !request.body.is_empty() {
    form = multipart_fields(form, &request.body);
  }
  for file in &request.files {
    let bytes = file_bytes(&file.uri).await?;
    let part = reqwest::multipart::Part::bytes(bytes)
      .file_name(file.filename.clone())
      .mime_str(&file.content_type)
      .map_err(|e| format!("NETWORK_ERROR|Invalid file type: {e}"))?;
    form = form.part(file.name.clone(), part);
  }
  Ok(form)
}

pub async fn request(request: HttpRequest, trust: &Trust) -> Result<HttpResult, String> {
  let client = strict_client(&trust.ca_pem, &trust.host, &trust.ip)?;
  ensure_allowed_host(&request.url, trust)?;

  let method = reqwest::Method::from_bytes(request.method.to_uppercase().as_bytes())
    .map_err(|e| format!("NETWORK_ERROR|Invalid method: {e}"))?;

  let mut builder = client.request(method, &request.url);
  for (key, value) in request.headers.iter().filter(|(key, _)| !identity::owns(key)) {
    builder = builder.header(key, value);
  }

  let builder = if !request.files.is_empty() {
    builder.multipart(multipart_form(&request).await?)
  } else if !request.body.is_empty() {
    builder.body(request.body)
  } else {
    builder
  };

  let response = builder.send().await.map_err(request_error)?;
  let status = f64::from(response.status().as_u16());
  let headers = response
    .headers()
    .iter()
    .map(|(key, value)| (key.to_string(), value.to_str().unwrap_or("").to_string()))
    .collect::<HashMap<String, String>>();
  let body = response.text().await.map_err(request_error)?;

  Ok(HttpResult { status, headers, body })
}

pub fn pinned_client(url: &str, trust: &Trust) -> Result<reqwest::Client, String> {
  ensure_allowed_host(url, trust)?;
  strict_client(&trust.ca_pem, &trust.host, &trust.ip)
}

pub async fn probe(url: &str, trust: &Trust, ip: &str) -> Result<(), String> {
  ip.parse::<IpAddr>()
    .map_err(|_| "HOST_NOT_ALLOWED|The candidate address is not an IP".to_string())?;
  ensure_allowed_host(url, trust)?;
  let client = strict_client(&trust.ca_pem, &trust.host, ip)?;
  client.get(url).send().await.map_err(request_error)?;
  Ok(())
}

#[cfg(test)]
mod tests {
  use std::net::{SocketAddr, TcpListener};
  use std::sync::mpsc;
  use std::time::Duration;

  use reqwest::dns::{Name, Resolve};

  use super::super::relay::RemoteProfile;
  use super::super::test_tls::{credential_free, serve, Behaviour, Vectors};
  use super::super::trust::Trust;
  use super::{ensure_allowed_host, inline_bytes, request, request_error, HttpRequest, PinnedResolver};

  const HOME: &str = "0123456789abcdef0123456789abcdef";

  #[test]
  fn a_recorded_note_travels_inline_as_a_data_uri() {
    let bytes = inline_bytes("data:audio/webm;codecs=opus;base64,T2dnUw==").expect("a data uri");
    assert_eq!(bytes.expect("decoded"), b"OggS".to_vec());
    assert!(inline_bytes("data:audio/webm;base64,***").expect("a data uri").is_err());
    assert!(inline_bytes("/tmp/note.m4a").is_none());
  }

  fn url_of(listener: &TcpListener) -> String {
    format!("http://{}/", listener.local_addr().expect("a bound address"))
  }

  fn remote() -> RemoteProfile {
    RemoteProfile {
      home_id: HOME.to_string(),
      domain: "argus-tunnel.lynk.page".to_string(),
    }
  }

  fn trust_with(remote: Option<RemoteProfile>) -> Trust {
    Trust {
      ca_pem: String::new(),
      host: "argus.local".to_string(),
      ip: "192.168.1.20".to_string(),
      remote,
    }
  }

  fn refused(url: &str, trust: &Trust) -> bool {
    ensure_allowed_host(url, trust).is_err_and(|error| error.starts_with("HOST_NOT_ALLOWED|"))
  }

  #[test]
  fn the_paired_host_is_admitted_as_before() {
    assert!(ensure_allowed_host("https://argus.local:7044/pairing/status", &trust_with(None)).is_ok());
    assert!(ensure_allowed_host("https://ARGUS.LOCAL:7044/pairing/status", &trust_with(Some(remote()))).is_ok());
    assert!(refused("https://argus.example:7044/pairing/status", &trust_with(None)));
  }

  #[test]
  fn a_device_name_is_admitted_only_for_this_home_and_its_services() {
    let away = trust_with(Some(remote()));
    for service in super::super::relay::HOME_SERVICES {
      let url = format!("https://{service}--{HOME}.argus-tunnel.lynk.page/x");
      assert!(ensure_allowed_host(&url, &away).is_ok(), "{url}");
      assert!(refused(&url, &trust_with(None)), "{url}");
    }
    assert!(refused("https://sync--fedcba9876543210fedcba9876543210.argus-tunnel.lynk.page/sync", &away));
    assert!(refused(&format!("https://turn--{HOME}.argus-tunnel.lynk.page/"), &away));
    assert!(refused(&format!("https://x.sync--{HOME}.argus-tunnel.lynk.page/sync"), &away));
    assert!(refused(&format!("https://sync--{HOME}.argus-tunnel.lynk.page.example.com/sync"), &away));
    assert!(refused("https://argus-tunnel.lynk.page/sync", &away));
    assert!(refused("not a url", &away));
  }

  fn resolver() -> PinnedResolver {
    PinnedResolver {
      allowed_host: "argus.local".to_string(),
      ip: "192.168.1.20".parse().ok(),
    }
  }

  async fn resolved(host: &str) -> Vec<SocketAddr> {
    let name: Name = host.parse().expect("a host name");
    resolver().resolve(name).await.expect("the name resolves").collect()
  }

  #[tokio::test]
  async fn the_paired_host_resolves_to_the_paired_address() {
    assert_eq!(resolved("ARGUS.local").await, vec!["192.168.1.20:0".parse::<SocketAddr>().expect("an address")]);
  }

  #[tokio::test]
  async fn any_other_name_is_resolved_by_the_system() {
    let addrs = resolved("localhost").await;
    assert!(!addrs.is_empty());
    assert!(addrs.iter().all(|addr| addr.ip().is_loopback()));
  }

  #[tokio::test]
  async fn a_server_that_fails_the_pin_refuses_the_request_before_any_header_leaves() {
    let vectors = Vectors::load();
    let server = serve(&vectors.rogue, Behaviour::Answer);
    let trust = Trust {
      ca_pem: vectors.ca.clone(),
      host: vectors.lan_host.clone(),
      ip: "127.0.0.1".to_string(),
      remote: None,
    };
    let refused = request(
      HttpRequest {
        url: format!("https://{}:{}/auth/status", vectors.lan_host, server.port),
        method: "GET".to_string(),
        headers: std::collections::HashMap::from([("Authorization".to_string(), "Bearer e2e-secret".to_string())]),
        body: String::new(),
        files: Vec::new(),
      },
      &trust,
    )
    .await
    .err()
    .unwrap_or_default();
    let seen = server.finish();
    assert!(refused.starts_with("CERT_NOT_TRUSTED|"), "{refused}");
    assert!(seen.plaintext.is_empty());
    assert!(credential_free(&seen.raw));
    assert!(!String::from_utf8_lossy(&seen.raw).contains("e2e-secret"));
  }

  #[tokio::test]
  async fn a_connection_that_never_completed_is_a_network_error() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("a free port");
    let url = url_of(&listener);
    drop(listener);

    let error = reqwest::Client::builder()
      .connect_timeout(Duration::from_millis(500))
      .build()
      .expect("a client")
      .get(url)
      .send()
      .await
      .expect_err("nothing listens on the port");

    assert!(request_error(error).starts_with("NETWORK_ERROR|"));
  }

  #[tokio::test]
  async fn an_answer_that_never_arrives_is_a_timeout() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("a free port");
    let url = url_of(&listener);
    let (release, held) = mpsc::channel::<()>();
    let holder = std::thread::spawn(move || {
      if let Ok((stream, _)) = listener.accept() {
        let _ = held.recv_timeout(Duration::from_secs(10));
        drop(stream);
      }
    });

    let error = reqwest::Client::builder()
      .read_timeout(Duration::from_millis(500))
      .build()
      .expect("a client")
      .get(url)
      .send()
      .await
      .expect_err("the server never answers");

    assert!(request_error(error).starts_with("TIMEOUT|"));
    let _ = release.send(());
    holder.join().expect("the holder thread returns");
  }
}
