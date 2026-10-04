use std::collections::HashMap;

use livekit::DisconnectReason;
use serde::{Deserialize, Serialize};

pub const AGENT_STATE_ATTRIBUTE: &str = "lk.agent.state";
pub const MICROPHONE_TRACK: &str = "microphone";
pub const LEVEL_FULL_SCALE: f32 = 32768.0;
pub const LEVEL_GAIN: f32 = 4.0;

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum CallState {
  Connecting,
  Connected,
  Reconnecting,
  Disconnected,
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum EndReason {
  Local,
  Revoked,
  Replaced,
  Ended,
  Lost,
}

#[derive(Serialize, Clone, Debug, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum RtcEvent {
  State { state: CallState, reason: Option<EndReason> },
  Agent { identity: String, state: Option<String> },
  Data { topic: String, payload: String },
  Level { local: f32, remote: f32 },
  AgentAudio { active: bool },
}

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct JoinRequest {
  pub url: String,
  pub token: String,
  pub agent_identity: String,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DataRequest {
  pub topic: String,
  pub payload: String,
}

pub fn agent_state(attributes: &HashMap<String, String>) -> Option<String> {
  attributes.get(AGENT_STATE_ATTRIBUTE).filter(|state| !state.is_empty()).cloned()
}

pub fn end_reason(reason: DisconnectReason) -> EndReason {
  match reason {
    DisconnectReason::ClientInitiated => EndReason::Local,
    DisconnectReason::ParticipantRemoved => EndReason::Revoked,
    DisconnectReason::DuplicateIdentity => EndReason::Replaced,
    DisconnectReason::RoomDeleted | DisconnectReason::RoomClosed => EndReason::Ended,
    _ => EndReason::Lost,
  }
}

pub fn pinned_url(url: &str, pinned_host: &str) -> Result<String, String> {
  let mut parsed = url::Url::parse(url).map_err(|error| format!("NETWORK_ERROR|Invalid call URL: {error}"))?;
  if parsed.scheme() != "wss" {
    return Err("CERT_NOT_TRUSTED|Only wss calls are allowed".to_string());
  }
  if pinned_host.is_empty() {
    return Err("PAIRING_REQUIRED|Server is not paired yet".to_string());
  }
  parsed
    .set_host(Some(pinned_host))
    .map_err(|error| format!("NETWORK_ERROR|Invalid paired host: {error}"))?;
  Ok(parsed.to_string())
}

pub fn level(samples: &[i16]) -> f32 {
  if samples.is_empty() {
    return 0.0;
  }
  let energy: f64 = samples.iter().map(|&sample| f64::from(sample) * f64::from(sample)).sum();
  let rms = (energy / samples.len() as f64).sqrt() as f32 / LEVEL_FULL_SCALE;
  (rms * LEVEL_GAIN).clamp(0.0, 1.0)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn agent_state_reads_the_livekit_attribute() {
    let mut attributes = HashMap::new();
    assert_eq!(agent_state(&attributes), None);
    attributes.insert(AGENT_STATE_ATTRIBUTE.to_string(), String::new());
    assert_eq!(agent_state(&attributes), None);
    attributes.insert(AGENT_STATE_ATTRIBUTE.to_string(), "speaking".to_string());
    assert_eq!(agent_state(&attributes).as_deref(), Some("speaking"));
  }

  #[test]
  fn a_removed_participant_is_a_revoked_session() {
    assert_eq!(end_reason(DisconnectReason::ParticipantRemoved), EndReason::Revoked);
    assert_eq!(end_reason(DisconnectReason::ClientInitiated), EndReason::Local);
    assert_eq!(end_reason(DisconnectReason::DuplicateIdentity), EndReason::Replaced);
    assert_eq!(end_reason(DisconnectReason::RoomClosed), EndReason::Ended);
    assert_eq!(end_reason(DisconnectReason::SignalClose), EndReason::Lost);
  }

  #[test]
  fn the_call_url_is_dialled_on_the_pinned_host() {
    assert_eq!(pinned_url("wss://192.168.1.4:7046", "argus.local").unwrap(), "wss://argus.local:7046/");
    assert_eq!(pinned_url("wss://argus.local:7046/x", "argus.local").unwrap(), "wss://argus.local:7046/x");
    assert!(pinned_url("ws://argus.local:7880", "argus.local").unwrap_err().starts_with("CERT_NOT_TRUSTED"));
    assert!(pinned_url("wss://argus.local:7046", "").unwrap_err().starts_with("PAIRING_REQUIRED"));
  }

  #[test]
  fn level_is_bounded_and_silent_at_zero() {
    assert_eq!(level(&[]), 0.0);
    assert_eq!(level(&[0; 160]), 0.0);
    assert_eq!(level(&[i16::MAX; 160]), 1.0);
    let quiet = level(&[800; 160]);
    assert!(quiet > 0.0 && quiet < 0.2);
  }

  #[test]
  fn events_serialize_in_the_shape_the_webview_reads() {
    let event = RtcEvent::State { state: CallState::Disconnected, reason: Some(EndReason::Revoked) };
    assert_eq!(
      serde_json::to_string(&event).unwrap(),
      r#"{"kind":"state","state":"disconnected","reason":"revoked"}"#
    );
    let audio = RtcEvent::AgentAudio { active: true };
    assert_eq!(serde_json::to_string(&audio).unwrap(), r#"{"kind":"agentAudio","active":true}"#);
  }
}
