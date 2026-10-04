use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use super::secure;

#[derive(Clone)]
pub struct Trust {
  pub ca_pem: String,
  pub host: String,
  pub ip: String,
}

pub struct PinnedServer<'a> {
  pub ca_pem: &'a str,
  pub ca_fingerprint: &'a str,
  pub host: &'a str,
  pub ip: &'a str,
}

static CACHE: Mutex<Option<Trust>> = Mutex::new(None);
static GENERATION: AtomicU64 = AtomicU64::new(0);

fn read(key: &str) -> Result<String, String> {
  Ok(secure::get(key)?.unwrap_or_default())
}

pub fn paired() -> Result<Trust, String> {
  if let Some(trust) = CACHE.lock().map_err(|e| e.to_string())?.clone() {
    return Ok(trust);
  }
  let generation = GENERATION.load(Ordering::Acquire);
  let trust = Trust {
    ca_pem: read("net.caPem")?,
    host: read("net.host")?,
    ip: read("net.ip")?,
  };
  if trust.ca_pem.is_empty() || trust.host.is_empty() || trust.ip.is_empty() {
    return Err("PAIRING_REQUIRED|Server is not paired yet".to_string());
  }
  let mut cache = CACHE.lock().map_err(|e| e.to_string())?;
  if GENERATION.load(Ordering::Acquire) == generation {
    *cache = Some(trust.clone());
  }
  Ok(trust)
}

pub fn pinned_fingerprint() -> Result<Option<String>, String> {
  Ok(secure::get("net.caFingerprint")?.filter(|value| !value.is_empty()))
}

pub fn pin(server: &PinnedServer<'_>) -> Result<(), String> {
  secure::set("net.caPem", server.ca_pem)?;
  secure::set("net.caFingerprint", server.ca_fingerprint)?;
  secure::set("net.host", server.host)?;
  secure::set("net.ip", server.ip)
}

pub fn relocate(ip: &str) -> Result<(), String> {
  secure::set("net.ip", ip)
}

#[cfg(test)]
pub fn seed(trust: Trust) {
  if let Ok(mut cache) = CACHE.lock() {
    *cache = Some(trust);
  }
}

pub fn forget() {
  GENERATION.fetch_add(1, Ordering::AcqRel);
  if let Ok(mut cache) = CACHE.lock() {
    *cache = None;
  }
}
