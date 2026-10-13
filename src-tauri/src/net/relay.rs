pub const HOME_SERVICES: [&str; 8] = [
  "auth",
  "identity",
  "sync",
  "camera",
  "productivity",
  "notification",
  "guard",
  "settings",
];

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RemoteProfile {
  pub home_id: String,
  pub domain: String,
}

fn is_home_id(value: &str) -> bool {
  value.len() == 32 && value.bytes().all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn is_label(label: &str) -> bool {
  let bytes = label.as_bytes();
  !bytes.is_empty()
    && bytes.len() <= 63
    && bytes.first() != Some(&b'-')
    && bytes.last() != Some(&b'-')
    && bytes.iter().all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || *byte == b'-')
}

fn is_top_level(label: &str) -> bool {
  (2..=63).contains(&label.len()) && label.bytes().all(|byte| byte.is_ascii_lowercase())
}

fn is_domain(value: &str) -> bool {
  let labels: Vec<&str> = value.split('.').collect();
  value.len() <= 253
    && labels.len() >= 2
    && labels.iter().all(|label| is_label(label))
    && labels.last().is_some_and(|label| is_top_level(label))
}

impl RemoteProfile {
  pub fn usable(&self) -> bool {
    is_home_id(&self.home_id) && is_domain(&self.domain)
  }

  fn names(&self, host: &str, service: &str) -> bool {
    host
      .strip_prefix(service)
      .and_then(|rest| rest.strip_prefix("--"))
      .and_then(|rest| rest.strip_prefix(self.home_id.as_str()))
      .and_then(|rest| rest.strip_prefix('.'))
      == Some(self.domain.as_str())
  }
}

pub fn admitted(host: &str, remote: &RemoteProfile) -> bool {
  remote.usable() && HOME_SERVICES.iter().any(|service| remote.names(host, service))
}

pub fn admitted_by(host: &str, remote: Option<&RemoteProfile>) -> bool {
  remote.is_some_and(|profile| admitted(host, profile))
}

#[cfg(test)]
mod tests {
  use super::{admitted, admitted_by, RemoteProfile, HOME_SERVICES};

  const VECTORS: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../tests/vectors/relay-hosts.json"));

  struct Vectors {
    remote: RemoteProfile,
    admitted: Vec<String>,
    refused: Vec<String>,
  }

  fn vectors() -> Vectors {
    let document: serde_json::Value = serde_json::from_str(VECTORS).expect("the vector file is JSON");
    let text = |key: &str| document[key].as_str().expect("a string field").to_string();
    let list = |key: &str| -> Vec<String> {
      document[key]
        .as_array()
        .expect("a list field")
        .iter()
        .map(|value| value.as_str().expect("a string entry").to_string())
        .collect()
    };
    Vectors {
      remote: RemoteProfile {
        home_id: text("homeId"),
        domain: text("domain"),
      },
      admitted: list("admitted"),
      refused: list("refused"),
    }
  }

  #[test]
  fn every_admitted_vector_is_one_of_this_homes_device_names() {
    let vectors = vectors();
    assert_eq!(vectors.admitted.len(), HOME_SERVICES.len());
    for host in &vectors.admitted {
      assert!(admitted(host, &vectors.remote), "{host} should be admitted");
    }
  }

  #[test]
  fn every_refused_vector_is_refused() {
    let vectors = vectors();
    assert!(vectors.refused.len() >= 30);
    for host in &vectors.refused {
      assert!(!admitted(host, &vectors.remote), "{host:?} should be refused");
    }
  }

  #[test]
  fn nothing_is_admitted_without_a_usable_profile() {
    let vectors = vectors();
    let uppercase = RemoteProfile {
      home_id: vectors.remote.home_id.to_uppercase(),
      domain: vectors.remote.domain.clone(),
    };
    let no_domain = RemoteProfile {
      home_id: vectors.remote.home_id.clone(),
      domain: String::new(),
    };
    for host in &vectors.admitted {
      assert!(!admitted_by(host, None));
      assert!(!admitted(host, &uppercase));
      assert!(!admitted(host, &no_domain));
    }
  }
}
