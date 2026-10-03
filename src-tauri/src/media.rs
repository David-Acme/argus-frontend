use webkit2gtk::glib::prelude::Cast;
use webkit2gtk::{
  PermissionRequestExt, SettingsExt, UserMediaPermissionRequest, UserMediaPermissionRequestExt,
  WebView, WebViewExt,
};

const APP_ORIGIN: &str = "tauri://localhost";

fn from_app(uri: Option<&str>) -> bool {
  uri.is_some_and(|uri| uri == APP_ORIGIN || uri.starts_with("tauri://localhost/"))
}

pub fn allow_app_microphone(webview: &WebView) {
  if let Some(settings) = WebViewExt::settings(webview) {
    settings.set_enable_media_stream(true);
    settings.set_enable_webaudio(true);
  }
  webview.connect_permission_request(|view, request| {
    let microphone_only = request
      .downcast_ref::<UserMediaPermissionRequest>()
      .is_some_and(|media| media.is_for_audio_device() && !media.is_for_video_device());
    let uri = view.uri();
    if microphone_only && from_app(uri.as_deref()) {
      request.allow();
    } else {
      request.deny();
    }
    true
  });
}

#[cfg(test)]
mod tests {
  use super::from_app;

  #[test]
  fn only_the_app_origin_may_ask_for_the_microphone() {
    assert!(from_app(Some("tauri://localhost")));
    assert!(from_app(Some("tauri://localhost/index.html")));
    assert!(!from_app(Some("tauri://localhost.evil.example/")));
    assert!(!from_app(Some("https://example.com/")));
    assert!(!from_app(None));
  }
}
