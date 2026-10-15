use std::sync::Mutex;
use std::time::Duration;

use tauri::{AppHandle, Emitter, EventTarget, Manager, UserAttentionType, WebviewUrl, WebviewWindowBuilder};

use crate::bridge::{self, Delivery};
use crate::tray::{self, failure, report};

pub const LABEL: &str = "call";
const PAGE: &str = "call/index.html";
const CANCEL_EVENT: &str = "argus-call-cancelled";
const DECLINE_FAILED_EVENT: &str = "argus-call-decline-failed";
const WIDTH: f64 = 340.0;
const HEIGHT: f64 = 210.0;
const RING_LIMIT: Duration = Duration::from_secs(90);
const INVALID_CALL: &str = "INVALID_CALL|The call id is not a call id";

#[derive(Default)]
pub struct CallWindowState {
  current: Mutex<Option<String>>,
}

pub fn valid_call_id(id: &str) -> bool {
  match id.strip_prefix("rtc-") {
    Some(hex) => hex.len() == 32 && hex.bytes().all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte)),
    None => id
      .strip_prefix("call-")
      .is_some_and(|digits| !digits.is_empty() && digits.bytes().all(|byte| byte.is_ascii_digit())),
  }
}

pub fn call_link(call_id: &str) -> String {
  format!("argus://call?callId={call_id}")
}

fn replace_script(call_id: &str) -> String {
  format!("window.location.replace('/{PAGE}?callId={call_id}');")
}

pub fn incoming(app: &AppHandle, call_id: String) {
  if !valid_call_id(&call_id) {
    return;
  }
  dispatch(app, move |handle| {
    if let Err(error) = present(handle, &call_id) {
      eprintln!("argus: call window: {error}");
    }
  });
}

pub fn cancelled(app: &AppHandle, call_id: String) {
  if !valid_call_id(&call_id) {
    return;
  }
  dispatch(app, move |handle| report(end(handle, &call_id)));
}

fn dispatch<F>(app: &AppHandle, work: F)
where
  F: FnOnce(&AppHandle) + Send + 'static,
{
  let handle = app.clone();
  report(app.run_on_main_thread(move || work(&handle)));
}

fn present(app: &AppHandle, call_id: &str) -> Result<(), String> {
  let window = match app.get_webview_window(LABEL) {
    Some(existing) => {
      existing.eval(replace_script(call_id)).map_err(failure)?;
      existing
    }
    None => WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App(format!("{PAGE}?callId={call_id}").into()))
      .title("Argus")
      .inner_size(WIDTH, HEIGHT)
      .resizable(false)
      .decorations(false)
      .always_on_top(true)
      .skip_taskbar(false)
      .center()
      .focused(true)
      .visible(true)
      .build()
      .map_err(failure)?,
  };
  window
    .unminimize()
    .and_then(|()| window.show())
    .and_then(|()| window.set_focus())
    .and_then(|()| window.request_user_attention(Some(UserAttentionType::Critical)))
    .map_err(failure)?;
  remember(app, call_id)?;
  schedule_ring_limit(app, call_id.to_string());
  Ok(())
}

fn remember(app: &AppHandle, call_id: &str) -> Result<(), String> {
  let Some(state) = app.try_state::<CallWindowState>() else {
    return Ok(());
  };
  let mut current = state.current.lock().map_err(failure)?;
  *current = Some(call_id.to_string());
  Ok(())
}

fn is_current(app: &AppHandle, call_id: &str) -> Result<bool, String> {
  let Some(state) = app.try_state::<CallWindowState>() else {
    return Ok(false);
  };
  let current = state.current.lock().map_err(failure)?;
  Ok(current.as_deref() == Some(call_id))
}

fn schedule_ring_limit(app: &AppHandle, call_id: String) {
  let handle = app.clone();
  std::thread::spawn(move || {
    std::thread::sleep(RING_LIMIT);
    dispatch(&handle, move |app| report(end(app, &call_id)));
  });
}

fn end(app: &AppHandle, call_id: &str) -> Result<(), String> {
  if !is_current(app, call_id)? {
    return Ok(());
  }
  if let Some(window) = app.get_webview_window(LABEL) {
    window.emit(CANCEL_EVENT, ()).map_err(failure)?;
  }
  retire(app)
}

fn retire(app: &AppHandle) -> Result<(), String> {
  if let Some(state) = app.try_state::<CallWindowState>() {
    let mut current = state.current.lock().map_err(failure)?;
    *current = None;
  }
  if let Some(window) = app.get_webview_window(LABEL) {
    window.close().map_err(failure)?;
  }
  Ok(())
}

#[tauri::command]
pub fn argus_call_answer(app: AppHandle, call_id: String) -> Result<(), String> {
  if !valid_call_id(&call_id) {
    return Err(INVALID_CALL.to_string());
  }
  tray::open_link_now(&app, call_link(&call_id))?;
  retire(&app)
}

#[tauri::command]
pub fn argus_call_decline(app: AppHandle, call_id: String) -> Result<(), String> {
  if !valid_call_id(&call_id) {
    return Err(INVALID_CALL.to_string());
  }
  bridge::send(&app, Delivery::Decline(call_id))
}

#[tauri::command]
pub fn argus_call_decline_result(app: AppHandle, call_id: String, ok: bool, code: Option<String>) -> Result<(), String> {
  if !valid_call_id(&call_id) {
    return Err(INVALID_CALL.to_string());
  }
  if ok {
    if is_current(&app, &call_id)? {
      retire(&app)?;
    }
    return Ok(());
  }
  app
    .emit_to(EventTarget::webview_window(LABEL), DECLINE_FAILED_EVENT, code.unwrap_or_default())
    .map_err(failure)
}

#[cfg(test)]
mod tests {
  use super::{call_link, replace_script, valid_call_id};

  #[test]
  fn only_the_two_call_id_shapes_are_accepted() {
    assert!(valid_call_id("rtc-0123456789abcdef0123456789abcdef"));
    assert!(valid_call_id("call-42"));
    assert!(!valid_call_id("rtc-0123456789ABCDEF0123456789abcdef"));
    assert!(!valid_call_id("rtc-0123456789abcdef"));
    assert!(!valid_call_id("call-"));
    assert!(!valid_call_id("call-4x"));
    assert!(!valid_call_id("call-1');alert(1);//"));
    assert!(!valid_call_id("../call-1"));
    assert!(!valid_call_id(""));
  }

  #[test]
  fn the_answer_link_is_the_android_call_link() {
    assert_eq!(call_link("call-7"), "argus://call?callId=call-7");
  }

  #[test]
  fn a_second_call_reuses_the_window_on_its_own_page() {
    assert_eq!(replace_script("call-8"), "window.location.replace('/call/index.html?callId=call-8');");
  }
}
