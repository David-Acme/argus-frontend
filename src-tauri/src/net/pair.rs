use serde_json::Value;

use super::Pairing;

const PAIRING_PATH: &str = "/pairing";

pub async fn pair(_host: &str, ip: &str, port: u16, code: &str) -> Result<Pairing, String> {
  let client = reqwest::Client::builder()
    .danger_accept_invalid_certs(true)
    .danger_accept_invalid_hostnames(true)
    .build()
    .map_err(|e| e.to_string())?;

  let url = format!("https://{ip}:{port}{PAIRING_PATH}");
  let response = client
    .post(&url)
    .json(&serde_json::json!({ "code": code.trim() }))
    .send()
    .await
    .map_err(|e| format!("NETWORK_ERROR|Pairing failed: {e}"))?;

  let status = response.status().as_u16();
  let body = response.text().await.map_err(|e| format!("NETWORK_ERROR|{e}"))?;
  if status != 200 {
    if status == 403 {
      return Err("INVALID_PAIRING_CODE|Invalid pairing code".to_string());
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
  let expected = code.trim().to_uppercase();
  if !expected.is_empty() && !ca_fingerprint.starts_with(&expected) {
    return Err("INVALID_PAIRING_CODE|Invalid pairing code".to_string());
  }

  let ca_pem = info.get("caPem").and_then(Value::as_str).unwrap_or("").to_string();
  let der = der_from_pem(&ca_pem).ok_or_else(|| "CERT_NOT_TRUSTED|Invalid CA certificate".to_string())?;
  if !sha256_hex_upper(&der).eq_ignore_ascii_case(&ca_fingerprint) {
    return Err("FINGERPRINT_MISMATCH|The server CA does not match the pairing code".to_string());
  }

  Ok(Pairing {
    ca_pem,
    ca_fingerprint,
    server_fingerprint: info.get("serverFingerprint").and_then(Value::as_str).unwrap_or("").to_string(),
    instance_id: info.get("instanceId").and_then(Value::as_str).unwrap_or("").to_string(),
    port: info.get("port").and_then(Value::as_f64).unwrap_or(port as f64),
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
