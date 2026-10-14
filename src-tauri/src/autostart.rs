use tauri::{AppHandle, Runtime};
use tauri_plugin_autostart::{ManagerExt, MacosLauncher};

pub fn plugin<R: Runtime>() -> tauri::plugin::TauriPlugin<R> {
  tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None)
}

#[tauri::command]
pub fn argus_autostart_get(app: AppHandle) -> Result<bool, String> {
  app
    .autolaunch()
    .is_enabled()
    .map_err(|error| format!("AUTOSTART_ERROR|{error}"))
}

#[tauri::command]
pub fn argus_autostart_set(app: AppHandle, enabled: bool) -> Result<(), String> {
  let launcher = app.autolaunch();
  let outcome = if enabled {
    launcher.enable()
  } else {
    launcher.disable()
  };
  outcome.map_err(|error| format!("AUTOSTART_ERROR|{error}"))
}
