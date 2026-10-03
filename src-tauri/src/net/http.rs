use std::collections::HashMap;
use std::error::Error as StdError;
use std::net::{IpAddr, SocketAddr};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::Duration;

use reqwest::dns::{Name, Resolve, Resolving};
use serde::{Deserialize, Serialize};
use serde_json::Value;

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
      let addrs = tokio::net::lookup_host(host.clone()).await?.collect::<Vec<_>>();
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
      if inner.downcast_ref::<rustls::Error>().is_some() {
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
  if error.is_timeout() {
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

fn ensure_allowed_host(url: &str, allowed_host: &str) -> Result<(), String> {
  let host = reqwest::Url::parse(url)
    .ok()
    .and_then(|u| u.host_str().map(str::to_lowercase))
    .unwrap_or_default();
  if host != allowed_host.to_lowercase() {
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

async fn multipart_form(request: &HttpRequest) -> Result<reqwest::multipart::Form, String> {
  let mut form = reqwest::multipart::Form::new();
  if !request.body.is_empty() {
    form = multipart_fields(form, &request.body);
  }
  for file in &request.files {
    let bytes = tokio::fs::read(&file.uri)
      .await
      .map_err(|_| "STORAGE_ERROR|The attached file cannot be read".to_string())?;
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
  ensure_allowed_host(&request.url, &trust.host)?;

  let method = reqwest::Method::from_bytes(request.method.to_uppercase().as_bytes())
    .map_err(|e| format!("NETWORK_ERROR|Invalid method: {e}"))?;

  let mut builder = client.request(method, &request.url);
  for (key, value) in &request.headers {
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

pub async fn probe(url: &str, trust: &Trust, ip: &str) -> Result<(), String> {
  ip.parse::<IpAddr>()
    .map_err(|_| "HOST_NOT_ALLOWED|The candidate address is not an IP".to_string())?;
  ensure_allowed_host(url, &trust.host)?;
  let client = strict_client(&trust.ca_pem, &trust.host, ip)?;
  client.get(url).send().await.map_err(request_error)?;
  Ok(())
}
