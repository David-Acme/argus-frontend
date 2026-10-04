use tauri::plugin::{Builder, TauriPlugin};
use tauri::Runtime;

pub const SCRIPT: &str =
  "window.addEventListener('contextmenu', (event) => event.preventDefault(), { capture: true });";

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("argus-context-menu").js_init_script(SCRIPT.to_string()).build()
}

#[cfg(test)]
mod tests {
  use super::SCRIPT;

  #[test]
  fn the_webview_menu_is_refused_before_any_page_handler_runs() {
    assert!(SCRIPT.starts_with("window.addEventListener('contextmenu'"));
    assert!(SCRIPT.contains("event.preventDefault()"));
    assert!(SCRIPT.contains("capture: true"));
  }

  #[test]
  fn keyboard_and_selection_events_are_left_alone() {
    for event in ["keydown", "copy", "paste", "cut", "selectstart", "mousedown"] {
      assert!(!SCRIPT.contains(event), "{event}");
    }
  }
}
