use std::sync::OnceLock;

use http::header::{HeaderMap, HeaderName, HeaderValue, USER_AGENT};

const PLATFORM: &str = "desktop";
const DEVICE_NAME_MAX: usize = 64;
const CLIENT_HEADER: &str = "x-argus-client";
const DEVICE_HEADER: &str = "x-argus-device";
const UNRESERVED_MARKS: &[u8] = b"-_.!~*'()";

static HEADERS: OnceLock<HeaderMap> = OnceLock::new();

pub fn headers() -> &'static HeaderMap {
  HEADERS.get_or_init(|| {
    let mut headers = HeaderMap::new();
    let entries = [
      (USER_AGENT, Some(format!("Argus/1 ({PLATFORM})"))),
      (HeaderName::from_static(CLIENT_HEADER), Some(format!("{PLATFORM}/{}", env!("CARGO_PKG_VERSION")))),
      (HeaderName::from_static(DEVICE_HEADER), clean_device_name(&host_name()).map(|name| encode_component(&name))),
    ];
    for (name, value) in entries {
      if let Some(value) = value.and_then(|value| HeaderValue::from_str(&value).ok()) {
        headers.insert(name, value);
      }
    }
    headers
  })
}

pub fn owns(name: &str) -> bool {
  let name = name.to_ascii_lowercase();
  name == USER_AGENT.as_str() || name == CLIENT_HEADER || name == DEVICE_HEADER
}

pub fn apply(target: &mut HeaderMap) {
  for (name, value) in headers() {
    target.insert(name.clone(), value.clone());
  }
}

fn clean_device_name(raw: &str) -> Option<String> {
  let spaced: String = raw.chars().map(|c| if c.is_control() { ' ' } else { c }).collect();
  let collapsed = spaced.split_whitespace().collect::<Vec<_>>().join(" ");
  let capped: String = collapsed.chars().take(DEVICE_NAME_MAX).collect();
  let trimmed = capped.trim();
  (!trimmed.is_empty()).then(|| trimmed.to_string())
}

fn encode_component(value: &str) -> String {
  value
    .bytes()
    .map(|byte| {
      if byte.is_ascii_alphanumeric() || UNRESERVED_MARKS.contains(&byte) {
        char::from(byte).to_string()
      } else {
        format!("%{byte:02X}")
      }
    })
    .collect()
}

#[cfg(target_os = "linux")]
fn host_name() -> String {
  let pretty = std::fs::read_to_string("/etc/machine-info").ok().and_then(|info| {
    info.lines().find_map(|line| {
      line
        .strip_prefix("PRETTY_HOSTNAME=")
        .map(|value| value.trim().trim_matches('"').to_string())
    })
  });
  pretty
    .filter(|name| !name.trim().is_empty())
    .or_else(|| std::fs::read_to_string("/proc/sys/kernel/hostname").ok())
    .or_else(|| std::fs::read_to_string("/etc/hostname").ok())
    .unwrap_or_default()
}

#[cfg(target_os = "macos")]
fn host_name() -> String {
  std::process::Command::new("/usr/sbin/scutil")
    .args(["--get", "ComputerName"])
    .output()
    .ok()
    .filter(|output| output.status.success())
    .map(|output| String::from_utf8_lossy(&output.stdout).into_owned())
    .unwrap_or_default()
}

#[cfg(target_os = "windows")]
fn host_name() -> String {
  std::env::var("COMPUTERNAME").unwrap_or_default()
}

#[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
fn host_name() -> String {
  String::new()
}

#[cfg(test)]
mod tests {
  use super::{clean_device_name, encode_component};

  #[test]
  fn encodes_like_encode_uri_component() {
    assert_eq!(encode_component("Mi PC (salón)"), "Mi%20PC%20(sal%C3%B3n)");
    assert_eq!(encode_component("a-b_c.d!e~f*g'h"), "a-b_c.d!e~f*g'h");
  }

  #[test]
  fn cleans_and_caps_device_names() {
    assert_eq!(clean_device_name("  office\n laptop\t"), Some("office laptop".to_string()));
    assert_eq!(clean_device_name(" \n "), None);
    assert_eq!(clean_device_name(&"ñ".repeat(80)).map(|name| name.chars().count()), Some(64));
  }
}
