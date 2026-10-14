use std::collections::VecDeque;
use std::sync::Mutex;

use serde::Deserialize;
use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::call_window;
use crate::notify::{self, Alert};
use crate::tray;

const SYNC_PATH: &str = "/sync";
const OP_ADD: u8 = 4;
const OP_CALL_INCOMING: u8 = 8;
const OP_CALL_CANCEL: u8 = 9;
const NOTIFICATION_TABLE: &str = "notification";
const RECENT_LIMIT: usize = 64;
const FALLBACK_TITLE: &str = "Argus";

#[derive(Default)]
pub struct SyncLinkState {
  live: Mutex<usize>,
  recent: Mutex<VecDeque<i64>>,
}

#[derive(Deserialize)]
struct Head {
  operation: Option<u8>,
  option: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CallInfo {
  call_id: String,
}

#[derive(Deserialize)]
struct CallFrame {
  info: CallInfo,
}

#[derive(Deserialize)]
struct NotificationRow {
  id: i64,
  #[serde(default)]
  title: String,
  #[serde(default)]
  body: String,
  #[serde(default)]
  data: Value,
}

#[derive(Deserialize)]
struct NotificationFrame {
  info: NotificationRow,
}

pub fn watches(url: &str) -> bool {
  url::Url::parse(url).is_ok_and(|parsed| parsed.scheme() == "wss" && parsed.path() == SYNC_PATH)
}

pub fn notification_link(id: i64) -> String {
  format!("argus://notification?notificationId={id}")
}

pub fn opened(app: &AppHandle) {
  let Some(state) = app.try_state::<SyncLinkState>() else {
    return;
  };
  let connections = match state.live.lock() {
    Ok(mut live) => {
      *live += 1;
      *live
    }
    Err(_) => 1,
  };
  if connections == 1 {
    tray::set_connected(app, true);
  }
}

pub fn closed(app: &AppHandle) {
  let Some(state) = app.try_state::<SyncLinkState>() else {
    return;
  };
  let remaining = match state.live.lock() {
    Ok(mut live) => {
      *live = live.saturating_sub(1);
      *live
    }
    Err(_) => 0,
  };
  if remaining == 0 {
    tray::set_connected(app, false);
  }
}

pub fn on_frame(app: &AppHandle, frame: &[u8]) {
  let Ok(head) = serde_json::from_slice::<Head>(frame) else {
    return;
  };
  match head.operation {
    Some(OP_CALL_INCOMING) => {
      if let Ok(call) = serde_json::from_slice::<CallFrame>(frame) {
        call_window::incoming(app, call.info.call_id);
      }
    }
    Some(OP_CALL_CANCEL) => {
      if let Ok(call) = serde_json::from_slice::<CallFrame>(frame) {
        call_window::cancelled(app, call.info.call_id);
      }
    }
    Some(OP_ADD) if head.option.as_deref() == Some(NOTIFICATION_TABLE) => {
      if let Ok(row) = serde_json::from_slice::<NotificationFrame>(frame) {
        show_notification(app, row.info);
      }
    }
    _ => {}
  }
}

fn show_notification(app: &AppHandle, row: NotificationRow) {
  let Some(state) = app.try_state::<SyncLinkState>() else {
    return;
  };
  if row.title.is_empty() && row.body.is_empty() {
    return;
  }
  if !remember(&state, row.id) {
    return;
  }
  let urgent = is_urgent(row.data.get("urgency").and_then(Value::as_str));
  let title = if row.title.is_empty() {
    FALLBACK_TITLE.to_string()
  } else {
    row.title
  };
  notify::show(
    app,
    Alert {
      title,
      body: row.body,
      urgent,
      open_link: Some(notification_link(row.id)),
    },
  );
}

fn remember(state: &SyncLinkState, id: i64) -> bool {
  let Ok(mut recent) = state.recent.lock() else {
    return true;
  };
  if recent.contains(&id) {
    return false;
  }
  recent.push_back(id);
  if recent.len() > RECENT_LIMIT {
    recent.pop_front();
  }
  true
}

pub fn is_urgent(urgency: Option<&str>) -> bool {
  matches!(urgency, Some("critical" | "time_sensitive"))
}

#[cfg(test)]
mod tests {
  use super::{is_urgent, notification_link, remember, watches, SyncLinkState, RECENT_LIMIT};

  #[test]
  fn only_the_sync_socket_of_a_tls_host_is_watched() {
    assert!(watches("wss://argus.local:7025/sync"));
    assert!(!watches("wss://argus.local:7025/media"));
    assert!(!watches("ws://argus.local:7025/sync"));
    assert!(!watches("not a url"));
  }

  #[test]
  fn a_notification_opens_its_route_through_the_deep_link() {
    assert_eq!(notification_link(42), "argus://notification?notificationId=42");
  }

  #[test]
  fn critical_and_time_sensitive_are_urgent() {
    assert!(is_urgent(Some("critical")));
    assert!(is_urgent(Some("time_sensitive")));
    assert!(!is_urgent(Some("active")));
    assert!(!is_urgent(Some("passive")));
    assert!(!is_urgent(None));
  }

  #[test]
  fn a_row_is_shown_once_within_the_recent_window() {
    let state = SyncLinkState::default();
    assert!(remember(&state, 7));
    assert!(!remember(&state, 7));
    for id in 100..(100 + RECENT_LIMIT as i64) {
      assert!(remember(&state, id));
    }
    assert!(remember(&state, 7));
  }
}
