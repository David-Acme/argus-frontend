use keyring::{Entry, Error as KeyringError};

const SERVICE: &str = "argus-desktop";
const USER: &str = "argus";
const WEBVIEW_KEYS: [&str; 8] = [
  "net.paired",
  "net.port",
  "net.instanceId",
  "net.pairedAt",
  "net.routes",
  "net.accessToken",
  "net.refreshToken",
  "net.deviceCredential",
];
const TRUST_KEYS: [&str; 4] = [
  "net.caPem",
  "net.caFingerprint",
  "net.host",
  "net.ip",
];

fn is_trust_key(key: &str) -> bool {
  TRUST_KEYS.contains(&key)
}

fn entry(key: &str) -> Result<Entry, String> {
  if !WEBVIEW_KEYS.contains(&key) && !is_trust_key(key) {
    return Err(format!("SECURE_KEY_NOT_ALLOWED|{key} is not a secure-storage key"));
  }
  Entry::new(SERVICE, &format!("{USER}:{key}")).map_err(|e| format!("STORAGE_ERROR|Keyring init failed: {e}"))
}

fn forget_trust_of(key: &str) {
  if is_trust_key(key) {
    super::trust::forget();
  }
}

pub fn get(key: &str) -> Result<Option<String>, String> {
  match entry(key)?.get_password() {
    Ok(value) => Ok(Some(value)),
    Err(KeyringError::NoEntry) => Ok(None),
    Err(e) => Err(format!("STORAGE_ERROR|Keyring read failed: {e}")),
  }
}

pub fn set_from_webview(key: &str, value: &str) -> Result<(), String> {
  if is_trust_key(key) {
    return Err(format!("SECURE_KEY_NOT_ALLOWED|{key} is written by the desktop host"));
  }
  set(key, value)
}

pub fn set(key: &str, value: &str) -> Result<(), String> {
  let written = entry(key)?
    .set_password(value)
    .map_err(|e| format!("STORAGE_ERROR|Keyring write failed: {e}"));
  forget_trust_of(key);
  written
}

pub fn delete_from_webview(key: &str) -> Result<(), String> {
  if is_trust_key(key) {
    return Err(format!("SECURE_KEY_NOT_ALLOWED|{key} is kept by the desktop host"));
  }
  delete(key)
}

pub fn delete(key: &str) -> Result<(), String> {
  let deleted = match entry(key)?.delete_credential() {
    Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
    Err(e) => Err(format!("STORAGE_ERROR|Keyring delete failed: {e}")),
  };
  forget_trust_of(key);
  deleted
}
