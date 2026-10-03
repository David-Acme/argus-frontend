use keyring::{Entry, Error as KeyringError};

const SERVICE: &str = "argus-desktop";
const USER: &str = "argus";
const ALLOWED_KEYS: [&str; 11] = [
  "net.paired",
  "net.caPem",
  "net.caFingerprint",
  "net.host",
  "net.ip",
  "net.port",
  "net.instanceId",
  "net.pairedAt",
  "net.routes",
  "net.accessToken",
  "net.refreshToken",
];

fn entry(key: &str) -> Result<Entry, String> {
  if !ALLOWED_KEYS.contains(&key) {
    return Err(format!("SECURE_KEY_NOT_ALLOWED|{key} is not a secure-storage key"));
  }
  Entry::new(SERVICE, &format!("{USER}:{key}")).map_err(|e| format!("Keyring init failed: {e}"))
}

pub fn get(key: &str) -> Result<Option<String>, String> {
  match entry(key)?.get_password() {
    Ok(value) => Ok(Some(value)),
    Err(KeyringError::NoEntry) => Ok(None),
    Err(e) => Err(format!("Keyring read failed: {e}")),
  }
}

pub fn set(key: &str, value: &str) -> Result<(), String> {
  entry(key)?.set_password(value).map_err(|e| format!("Keyring write failed: {e}"))
}

pub fn delete(key: &str) -> Result<(), String> {
  match entry(key)?.delete_credential() {
    Ok(()) => Ok(()),
    Err(KeyringError::NoEntry) => Ok(()),
    Err(e) => Err(format!("Keyring delete failed: {e}")),
  }
}
