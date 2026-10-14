use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, EventTarget, Listener, Manager};

use crate::tray::{failure, report, MAIN_LABEL};

pub const READY_EVENT: &str = "argus-bridge-ready";
pub const OPEN_LINK_EVENT: &str = "argus-open-link";
pub const DECLINE_EVENT: &str = "argus-call-decline";
pub const MAIN_UNAVAILABLE: &str = "MAIN_UNAVAILABLE|The main window is gone";
const CALL_LINK_PREFIX: &str = "argus://call?";

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Delivery {
  OpenLink(String),
  Decline(String),
}

#[derive(Clone, Serialize)]
pub struct OpenLinkPayload {
  pub link: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeclineRequest {
  pub call_id: String,
}

#[derive(Default)]
pub struct BridgeState {
  handoff: Mutex<Handoff>,
}

#[derive(Default)]
struct Handoff {
  ready: bool,
  pending: Vec<Delivery>,
}

impl Handoff {
  fn admit(&mut self, delivery: Delivery) -> Option<Delivery> {
    if self.ready {
      return Some(delivery);
    }
    if is_call_open(&delivery) {
      self.pending.retain(|queued| !is_call_open(queued));
    }
    self.pending.push(delivery);
    None
  }

  fn become_ready(&mut self) -> Vec<Delivery> {
    self.ready = true;
    std::mem::take(&mut self.pending)
  }
}

fn is_call_open(delivery: &Delivery) -> bool {
  matches!(delivery, Delivery::OpenLink(link) if link.starts_with(CALL_LINK_PREFIX))
}

pub fn require_main(main_present: bool) -> Result<(), String> {
  if main_present {
    Ok(())
  } else {
    Err(MAIN_UNAVAILABLE.to_string())
  }
}

pub fn send(app: &AppHandle, delivery: Delivery) -> Result<(), String> {
  if let Err(error) = require_main(app.get_webview_window(MAIN_LABEL).is_some()) {
    eprintln!("argus: the main webview is gone, a call action cannot reach it");
    return Err(error);
  }
  let Some(state) = app.try_state::<BridgeState>() else {
    return Err(failure("the bridge state is missing"));
  };
  let now = state.handoff.lock().map_err(failure)?.admit(delivery);
  match now {
    Some(delivery) => emit(app, &delivery),
    None => Ok(()),
  }
}

fn emit(app: &AppHandle, delivery: &Delivery) -> Result<(), String> {
  let target = EventTarget::webview_window(MAIN_LABEL);
  let outcome = match delivery {
    Delivery::OpenLink(link) => app.emit_to(target, OPEN_LINK_EVENT, OpenLinkPayload { link: link.clone() }),
    Delivery::Decline(call_id) => app.emit_to(
      target,
      DECLINE_EVENT,
      DeclineRequest {
        call_id: call_id.clone(),
      },
    ),
  };
  outcome.map_err(failure)
}

pub fn listen_ready(app: &AppHandle) {
  let handle = app.clone();
  app.listen(READY_EVENT, move |_event| {
    report(become_ready(&handle));
  });
}

fn become_ready(app: &AppHandle) -> Result<(), String> {
  let Some(state) = app.try_state::<BridgeState>() else {
    return Err(failure("the bridge state is missing"));
  };
  let pending = state.handoff.lock().map_err(failure)?.become_ready();
  for delivery in &pending {
    report(emit(app, delivery));
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::{is_call_open, require_main, DeclineRequest, Delivery, Handoff, OpenLinkPayload, MAIN_UNAVAILABLE};

  fn open(link: &str) -> Delivery {
    Delivery::OpenLink(link.to_string())
  }

  #[test]
  fn an_open_link_emitted_before_ready_is_delivered_exactly_once_after_ready() {
    let mut handoff = Handoff::default();
    assert!(handoff.admit(open("argus://notification?notificationId=7")).is_none());
    assert_eq!(handoff.become_ready(), vec![open("argus://notification?notificationId=7")]);
    assert!(handoff.become_ready().is_empty());
  }

  #[test]
  fn after_ready_an_open_link_is_emitted_at_once() {
    let mut handoff = Handoff::default();
    handoff.become_ready();
    assert_eq!(handoff.admit(open("argus://call?callId=call-7")), Some(open("argus://call?callId=call-7")));
  }

  #[test]
  fn before_ready_only_the_latest_call_survives_and_notifications_keep_their_order() {
    let mut handoff = Handoff::default();
    handoff.admit(open("argus://call?callId=call-1"));
    handoff.admit(open("argus://notification?notificationId=1"));
    handoff.admit(open("argus://call?callId=call-2"));
    handoff.admit(open("argus://notification?notificationId=2"));
    assert_eq!(
      handoff.become_ready(),
      vec![
        open("argus://notification?notificationId=1"),
        open("argus://call?callId=call-2"),
        open("argus://notification?notificationId=2"),
      ]
    );
  }

  #[test]
  fn a_decline_before_ready_is_delivered_after_ready() {
    let mut handoff = Handoff::default();
    handoff.admit(Delivery::Decline("call-7".to_string()));
    assert_eq!(handoff.become_ready(), vec![Delivery::Decline("call-7".to_string())]);
  }

  #[test]
  fn a_missing_main_window_refuses_the_delivery_with_its_code() {
    assert_eq!(require_main(false), Err(MAIN_UNAVAILABLE.to_string()));
    assert_eq!(require_main(true), Ok(()));
  }

  #[test]
  fn only_call_links_supersede_each_other() {
    assert!(is_call_open(&open("argus://call?callId=call-1")));
    assert!(!is_call_open(&open("argus://notification?notificationId=1")));
    assert!(!is_call_open(&Delivery::Decline("call-1".to_string())));
  }

  #[test]
  fn the_open_link_event_carries_only_the_link() {
    let payload = serde_json::to_value(OpenLinkPayload {
      link: "argus://notification?notificationId=42".to_string(),
    })
    .expect("a payload");
    assert_eq!(payload, serde_json::json!({ "link": "argus://notification?notificationId=42" }));
  }

  #[test]
  fn the_decline_event_carries_the_call_id_and_nothing_else() {
    let payload = serde_json::to_value(DeclineRequest {
      call_id: "call-9".to_string(),
    })
    .expect("a payload");
    assert_eq!(payload, serde_json::json!({ "callId": "call-9" }));
  }
}
