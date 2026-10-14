use tauri::AppHandle;

use crate::tray;

pub struct Alert {
  pub title: String,
  pub body: String,
  pub urgent: bool,
  pub open_link: Option<String>,
}

pub fn show(app: &AppHandle, alert: Alert) {
  tray::report(present(app, alert));
}

#[cfg(target_os = "linux")]
const OPEN_ACTION: &str = "default";
#[cfg(target_os = "linux")]
const OPEN_LABEL: &str = "Abrir";

#[cfg(target_os = "linux")]
fn present(app: &AppHandle, alert: Alert) -> Result<(), String> {
  let urgency = if alert.urgent {
    notify_rust::Urgency::Critical
  } else {
    notify_rust::Urgency::Normal
  };
  let mut note = notify_rust::Notification::new();
  note
    .appname("Argus")
    .summary(&alert.title)
    .body(&alert.body)
    .urgency(urgency);
  if alert.open_link.is_some() {
    note.action(OPEN_ACTION, OPEN_LABEL);
  }
  let handle = note.show().map_err(tray::failure)?;
  if let Some(link) = alert.open_link {
    let app = app.clone();
    std::thread::spawn(move || {
      handle.wait_for_action(move |action| {
        if action == OPEN_ACTION {
          tray::open_link(&app, link);
        }
      });
    });
  }
  Ok(())
}

#[cfg(not(target_os = "linux"))]
fn present(app: &AppHandle, alert: Alert) -> Result<(), String> {
  use tauri_plugin_notification::NotificationExt;
  app
    .notification()
    .builder()
    .title(alert.title)
    .body(alert.body)
    .show()
    .map_err(tray::failure)
}
