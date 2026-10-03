use std::collections::BTreeMap;
use std::time::{Duration, Instant};

use mdns_sd::{ServiceDaemon, ServiceEvent};

use super::{Discovery, Route};

const SERVICE_TYPE: &str = "_argus-route._tcp.local.";
const DISCOVERED_HOST: &str = "argus.local";
const PAIRING_ROUTE: &str = "/pairing";
const SETTLE: Duration = Duration::from_millis(1500);

pub async fn discover(timeout: Duration) -> Result<Discovery, String> {
  let daemon = ServiceDaemon::new().map_err(|e| format!("mDNS init failed: {e}"))?;
  let receiver = daemon
    .browse(SERVICE_TYPE)
    .map_err(|e| format!("mDNS browse failed: {e}"))?;

  let mut deadline = Instant::now() + timeout;
  let mut first_ip: Option<String> = None;
  let mut routes: BTreeMap<String, Route> = BTreeMap::new();
  while Instant::now() < deadline {
    let remaining = deadline.saturating_duration_since(Instant::now());
    match tokio::time::timeout(remaining, receiver.recv_async()).await {
      Ok(Ok(ServiceEvent::ServiceResolved(info))) => {
        let Some(addr) = info.get_addresses().iter().find(|a| a.is_ipv4()) else {
          continue;
        };
        let ip = addr.to_string();
        let path = info.get_property_val_str("path").unwrap_or("").trim_matches('/').to_string();
        if path.is_empty() {
          continue;
        }
        match &first_ip {
          None => {
            first_ip = Some(ip.clone());
            deadline = deadline.min(Instant::now() + SETTLE);
          }
          Some(existing) if *existing != ip => continue,
          Some(_) => {}
        }
        let https = info.get_property_val_str("https") == Some("true");
        let key = format!("/{path}");
        routes.insert(key.clone(), Route { path: key, port: info.get_port() as f64, https });
      }
      Ok(Err(_)) | Err(_) => break,
      _ => {}
    }
  }
  let _ = daemon.shutdown();

  let ip = first_ip.ok_or_else(|| "DISCOVERY_NOT_FOUND".to_string())?;
  let entry = routes
    .get(PAIRING_ROUTE)
    .or_else(|| routes.values().next())
    .cloned()
    .ok_or_else(|| "DISCOVERY_NOT_FOUND".to_string())?;
  Ok(Discovery {
    host: DISCOVERED_HOST.to_string(),
    ip,
    port: entry.port,
    https: entry.https,
    routes: routes.into_values().collect(),
  })
}
