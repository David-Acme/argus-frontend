use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr};
use std::sync::{Arc, Mutex, OnceLock};

use reqwest::dns::{Name, Resolve, Resolving};
use serde::{Deserialize, Serialize};

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
      let addrs = tokio::net::lookup_host(host.clone()).await?.collect::<Vec<_>>();
      Ok(Box::new(addrs.into_iter()) as Box<dyn Iterator<Item = SocketAddr> + Send>)
    })
  }
}

fn strict_client(ca_pem: &str, allowed_host: &str, ip: &str) -> Result<reqwest::Client, String> {
  let cache_key = format!("{ca_pem}|{allowed_host}|{ip}");
  let cache = CLIENT_CACHE.get_or_init(|| Mutex::new(HashMap::new()));
  if let Some(client) = cache.lock().unwrap().get(&cache_key) {
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
    .build()
    .map_err(|e| format!("NETWORK_ERROR|{e}"))?;

  cache.lock().unwrap().insert(cache_key, client.clone());
  Ok(client)
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

pub async fn request(request: HttpRequest, ca_pem: &str, allowed_host: &str, ip: &str) -> Result<HttpResult, String> {
  if ca_pem.is_empty() {
    return Err("PAIRING_REQUIRED|Server is not paired yet".to_string());
  }

  let client = strict_client(ca_pem, allowed_host, ip)?;

  let method = reqwest::Method::from_bytes(request.method.to_uppercase().as_bytes())
    .map_err(|e| format!("NETWORK_ERROR|Invalid method: {e}"))?;

  let host = reqwest::Url::parse(&request.url)
    .ok()
    .and_then(|u| u.host_str().map(|h| h.to_lowercase()))
    .unwrap_or_default();
  if host != allowed_host.to_lowercase() {
    return Err("HOST_NOT_ALLOWED|Host is not allowed".to_string());
  }

  let mut builder = client.request(method, &request.url);
  for (key, value) in &request.headers {
    builder = builder.header(key, value);
  }

  let builder = if !request.files.is_empty() {
    let mut form = reqwest::multipart::Form::new();
    for file in &request.files {
      let bytes = std::fs::read(&file.uri).map_err(|e| format!("Cannot read {}: {e}", file.uri))?;
      let part = reqwest::multipart::Part::bytes(bytes)
        .file_name(file.filename.clone())
        .mime_str(&file.content_type)
        .map_err(|e| e.to_string())?;
      form = form.part(file.name.clone(), part);
    }
    if !request.body.is_empty() {
      form = form.text("payload", request.body.clone());
    }
    builder.multipart(form)
  } else if !request.body.is_empty() {
    builder.body(request.body)
  } else {
    builder
  };

  let response = builder.send().await.map_err(|e| format!("Request failed: {e}"))?;
  let status = response.status().as_u16() as f64;
  let headers = response
    .headers()
    .iter()
    .map(|(key, value)| (key.to_string(), value.to_str().unwrap_or("").to_string()))
    .collect::<HashMap<String, String>>();
  let body = response.text().await.map_err(|e| e.to_string())?;

  Ok(HttpResult { status, headers, body })
}
