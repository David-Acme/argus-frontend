use std::future::Future;
use std::time::Duration;

use serde::Deserialize;
use serde_json::Value;

use super::confirm::{changes_anchor, TrustChange};
use super::trust::{self, PinnedServer};
use super::Pairing;

const PAIRING_PATH: &str = "/pairing";
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const PAIRING_TIMEOUT: Duration = Duration::from_secs(20);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairExpectation {
  pub ca_fingerprint: String,
  pub instance_id: String,
}

pub struct PairInput {
  pub host: String,
  pub ip: String,
  pub port: u16,
  pub code: String,
  pub expect: Option<PairExpectation>,
}

pub async fn pair<F, Fut>(input: PairInput, confirm: F) -> Result<Pairing, String>
where
  F: FnOnce(TrustChange) -> Fut,
  Fut: Future<Output = bool>,
{
  let PairInput { host, ip, port, code, expect } = input;
  let client = reqwest::Client::builder()
    .danger_accept_invalid_certs(true)
    .danger_accept_invalid_hostnames(true)
    .redirect(reqwest::redirect::Policy::none())
    .default_headers(super::identity::headers().clone())
    .connect_timeout(CONNECT_TIMEOUT)
    .timeout(PAIRING_TIMEOUT)
    .build()
    .map_err(|e| format!("NETWORK_ERROR|{e}"))?;

  let key = code.trim().to_uppercase();
  let nonce = random_hex(16)?;
  let url = format!("https://{ip}:{port}{PAIRING_PATH}");
  let response = client
    .post(&url)
    .json(&serde_json::json!({
      "nonce": nonce,
      "proof": hmac_hex(&key, &format!("argus-pair-client|{nonce}")),
    }))
    .send()
    .await
    .map_err(|e| if e.is_timeout() { "TIMEOUT|Pairing timed out".to_string() } else { format!("NETWORK_ERROR|Pairing failed: {}", e.without_url()) })?;

  let status = response.status().as_u16();
  let body = response.text().await.map_err(|e| format!("NETWORK_ERROR|{}", e.without_url()))?;
  if status != 200 {
    if status == 403 || status == 422 {
      return Err("INVALID_PAIRING_CODE|Invalid pairing code".to_string());
    }
    if status == 409 {
      return Err("ALREADY_PAIRED|Server already paired".to_string());
    }
    return Err(format!("NETWORK_ERROR|Pairing failed (HTTP {status})"));
  }

  let root: Value = serde_json::from_str(&body).map_err(|_| "NETWORK_ERROR|Malformed pairing response".to_string())?;
  let info = root.get("info").and_then(Value::as_object).ok_or("NETWORK_ERROR|Malformed pairing response")?;

  let ca_fingerprint = info
    .get("caFingerprint")
    .and_then(Value::as_str)
    .ok_or("NETWORK_ERROR|Malformed pairing response")?
    .to_uppercase();
  let server_proof = info.get("serverProof").and_then(Value::as_str).unwrap_or("").to_uppercase();
  let expected_proof = hmac_hex(&key, &format!("argus-pair-server|{nonce}|{ca_fingerprint}"));
  if server_proof != expected_proof {
    return Err("FINGERPRINT_MISMATCH|The server could not prove the pairing code".to_string());
  }

  let ca_pem = info.get("caPem").and_then(Value::as_str).unwrap_or("").to_string();
  let der = der_from_pem(&ca_pem).ok_or_else(|| "CERT_NOT_TRUSTED|Invalid CA certificate".to_string())?;
  if !sha256_hex_upper(&der).eq_ignore_ascii_case(&ca_fingerprint) {
    return Err("FINGERPRINT_MISMATCH|The server CA does not match the pairing code".to_string());
  }

  let instance_id = info.get("instanceId").and_then(Value::as_str).unwrap_or("").to_string();
  if let Some(expect) = &expect {
    if !expect.ca_fingerprint.eq_ignore_ascii_case(&ca_fingerprint)
      || !expect.instance_id.eq_ignore_ascii_case(&instance_id)
    {
      return Err("FINGERPRINT_MISMATCH|The server fingerprint does not match the scanned QR".to_string());
    }
  }

  let pinned = trust::pinned_fingerprint()?;
  if changes_anchor(pinned.as_deref(), &ca_fingerprint) {
    let change = TrustChange {
      previous: pinned.unwrap_or_default(),
      next: ca_fingerprint.clone(),
      host: host.clone(),
    };
    if !confirm(change).await {
      return Err("PAIRING_DECLINED|The new server was not confirmed on this computer".to_string());
    }
  }

  trust::pin(&PinnedServer {
    ca_pem: &ca_pem,
    ca_fingerprint: &ca_fingerprint,
    host: &host,
    ip: &ip,
  })?;

  Ok(Pairing {
    ca_pem,
    ca_fingerprint,
    server_fingerprint: info.get("serverFingerprint").and_then(Value::as_str).unwrap_or("").to_string(),
    instance_id,
    port: info.get("port").and_then(Value::as_f64).unwrap_or(f64::from(port)),
    scheme: info.get("scheme").and_then(Value::as_str).unwrap_or("https").to_string(),
  })
}

fn der_from_pem(pem: &str) -> Option<Vec<u8>> {
  use base64::Engine as _;

  let base64: String = pem
    .lines()
    .map(str::trim)
    .filter(|line| !line.is_empty() && !line.starts_with("-----"))
    .collect();
  base64::engine::general_purpose::STANDARD.decode(base64).ok()
}

fn sha256_hex_upper(data: &[u8]) -> String {
  use sha2::{Digest, Sha256};

  let digest = Sha256::digest(data);
  digest.iter().map(|byte| format!("{byte:02X}")).collect()
}

fn random_hex(bytes: usize) -> Result<String, String> {
  let mut buffer = vec![0u8; bytes];
  getrandom::getrandom(&mut buffer).map_err(|e| format!("NETWORK_ERROR|{e}"))?;
  Ok(buffer.iter().map(|byte| format!("{byte:02x}")).collect())
}

fn hmac_hex(key: &str, message: &str) -> String {
  use hmac::{Hmac, Mac};

  let mut mac = <Hmac<sha2::Sha256> as Mac>::new_from_slice(key.as_bytes())
    .expect("HMAC accepts keys of any length");
  mac.update(message.as_bytes());
  mac.finalize().into_bytes().iter().map(|byte| format!("{byte:02X}")).collect()
}
