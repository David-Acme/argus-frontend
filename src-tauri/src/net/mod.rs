pub mod discover;
pub mod http;
pub mod pair;
pub mod secure;
pub mod socket;

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Discovery {
  pub host: String,
  pub ip: String,
  pub port: f64,
  pub https: bool,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Pairing {
  pub ca_pem: String,
  pub ca_fingerprint: String,
  pub server_fingerprint: String,
  pub instance_id: String,
  pub port: f64,
  pub scheme: String,
}
