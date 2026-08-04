use std::time::{Duration, Instant};

use mdns_sd::{ServiceDaemon, ServiceEvent};

use super::Discovery;

const SERVICE_TYPE: &str = "_argus._tcp.local.";
const DISCOVERED_HOST: &str = "argus.local";

pub async fn discover(timeout: Duration) -> Result<Discovery, String> {
  let daemon = ServiceDaemon::new().map_err(|e| format!("mDNS init failed: {e}"))?;
  let receiver = daemon
    .browse(SERVICE_TYPE)
    .map_err(|e| format!("mDNS browse failed: {e}"))?;

  let deadline = Instant::now() + timeout;
  while Instant::now() < deadline {
    let remaining = deadline.saturating_duration_since(Instant::now());
    match tokio::time::timeout(remaining, receiver.recv_async()).await {
      Ok(Ok(ServiceEvent::ServiceResolved(info))) => {
        if let Some(addr) = info.get_addresses().iter().find(|a| a.is_ipv4()) {
          return Ok(Discovery {
            host: DISCOVERED_HOST.to_string(),
            ip: addr.to_string(),
            port: info.get_port() as f64,
            https: true,
          });
        }
      }
      Ok(Err(_)) | Err(_) => break,
      _ => {}
    }
  }

  Err("DISCOVERY_NOT_FOUND".to_string())
}
