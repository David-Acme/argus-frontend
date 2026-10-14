use std::fmt::Display;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Window, WindowEvent, Wry};

use crate::bridge::{self, Delivery};

pub const MAIN_LABEL: &str = "main";
const TRAY_ID: &str = "argus";
const OPEN_ID: &str = "open";
const STATUS_ID: &str = "status";
const QUIT_ID: &str = "quit";
const OPEN_TEXT: &str = "Abrir Argus";
const QUIT_TEXT: &str = "Salir";
const ONLINE_TEXT: &str = "Conectado";
const OFFLINE_TEXT: &str = "Sin conexión";

pub struct TrayState {
  status: MenuItem<Wry>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum CloseOutcome {
  Ignored,
  HideToTray,
  ExitApp,
}

pub fn close_outcome(label: &str, tray_installed: bool) -> CloseOutcome {
  if label != MAIN_LABEL {
    CloseOutcome::Ignored
  } else if tray_installed {
    CloseOutcome::HideToTray
  } else {
    CloseOutcome::ExitApp
  }
}

pub fn failure(error: impl Display) -> String {
  format!("WINDOW_ERROR|{error}")
}

pub fn report<T, E: Display>(result: Result<T, E>) {
  if let Err(error) = result {
    eprintln!("argus: {error}");
  }
}

pub fn install(app: &AppHandle) -> tauri::Result<()> {
  let open = MenuItem::with_id(app, OPEN_ID, OPEN_TEXT, true, None::<&str>)?;
  let status = MenuItem::with_id(app, STATUS_ID, OFFLINE_TEXT, false, None::<&str>)?;
  let separator = PredefinedMenuItem::separator(app)?;
  let quit = MenuItem::with_id(app, QUIT_ID, QUIT_TEXT, true, None::<&str>)?;
  let menu = Menu::with_items(app, &[&open, &status, &separator, &quit])?;
  let mut builder = TrayIconBuilder::<Wry>::with_id(TRAY_ID)
    .menu(&menu)
    .tooltip("Argus")
    .show_menu_on_left_click(false)
    .on_menu_event(|app, event| match event.id().as_ref() {
      OPEN_ID => report(show_main(app)),
      QUIT_ID => app.exit(0),
      _ => {}
    })
    .on_tray_icon_event(|tray, event| {
      if let TrayIconEvent::Click {
        button: MouseButton::Left,
        button_state: MouseButtonState::Up,
        ..
      } = event
      {
        report(show_main(tray.app_handle()));
      }
    });
  if let Some(icon) = app.default_window_icon() {
    builder = builder.icon(icon.clone());
  }
  builder.build(app)?;
  app.manage(TrayState { status });
  Ok(())
}

pub fn on_window_event(window: &Window, event: &WindowEvent) {
  let WindowEvent::CloseRequested { api, .. } = event else {
    return;
  };
  match close_outcome(window.label(), window.try_state::<TrayState>().is_some()) {
    CloseOutcome::Ignored => {}
    CloseOutcome::HideToTray => {
      api.prevent_close();
      report(window.hide());
    }
    CloseOutcome::ExitApp => window.app_handle().exit(0),
  }
}

pub fn set_connected(app: &AppHandle, connected: bool) {
  let handle = app.clone();
  report(app.run_on_main_thread(move || {
    if let Some(state) = handle.try_state::<TrayState>() {
      let text = if connected { ONLINE_TEXT } else { OFFLINE_TEXT };
      report(state.status.set_text(text));
    }
  }));
}

pub fn show_main(app: &AppHandle) -> Result<(), String> {
  let Some(window) = app.get_webview_window(MAIN_LABEL) else {
    return Ok(());
  };
  window
    .unminimize()
    .and_then(|()| window.show())
    .and_then(|()| window.set_focus())
    .map_err(failure)
}

pub fn open_link(app: &AppHandle, link: String) {
  let handle = app.clone();
  report(app.run_on_main_thread(move || report(open_link_now(&handle, link))));
}

pub fn open_link_now(app: &AppHandle, link: String) -> Result<(), String> {
  show_main(app)?;
  bridge::send(app, Delivery::OpenLink(link))
}

#[cfg(test)]
mod tests {
  use super::{close_outcome, CloseOutcome};

  #[test]
  fn with_a_tray_a_close_on_the_main_window_hides_it_and_nothing_else() {
    assert_eq!(close_outcome("main", true), CloseOutcome::HideToTray);
  }

  #[test]
  fn with_no_tray_a_close_on_the_main_window_requests_the_exit_not_a_hide() {
    let outcome = close_outcome("main", false);
    assert_eq!(outcome, CloseOutcome::ExitApp);
    assert_ne!(outcome, CloseOutcome::HideToTray);
  }

  #[test]
  fn the_call_window_close_is_not_intercepted_with_or_without_a_tray() {
    assert_eq!(close_outcome("call", true), CloseOutcome::Ignored);
    assert_eq!(close_outcome("call", false), CloseOutcome::Ignored);
  }
}
