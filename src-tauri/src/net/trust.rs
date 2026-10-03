use std::sync::Mutex;

use super::secure;

#[derive(Clone)]
pub struct Trust {
  pub ca_pem: String,
  pub host: String,
  pub ip: String,
}

static CACHE: Mutex<Option<Trust>> = Mutex::new(None);

fn read(key: &str) -> Result<String, String> {
  Ok(secure::get(key)?.unwrap_or_default())
}

pub fn paired() -> Result<Trust, String> {
  if let Some(trust) = CACHE.lock().map_err(|e| e.to_string())?.clone() {
    return Ok(trust);
  }
  let trust = Trust {
    ca_pem: read("net.caPem")?,
    host: read("net.host")?,
    ip: read("net.ip")?,
  };
  if trust.ca_pem.is_empty() || trust.host.is_empty() || trust.ip.is_empty() {
    return Err("PAIRING_REQUIRED|Server is not paired yet".to_string());
  }
  *CACHE.lock().map_err(|e| e.to_string())? = Some(trust.clone());
  Ok(trust)
}

pub fn forget() {
  if let Ok(mut cache) = CACHE.lock() {
    *cache = None;
  }
}
