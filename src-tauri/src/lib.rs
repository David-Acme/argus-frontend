mod context_menu;
#[cfg(target_os = "linux")]
mod media;
mod net;
mod rtc;

use std::time::Duration;

use net::discover::discover;
use net::http::{probe as http_probe, request as http_request, HttpRequest, HttpResult};
use net::pair::{pair, PairExpectation, PairInput};
use net::secure::{delete_from_webview as secure_delete, get as secure_get, set_from_webview as secure_set};
use net::socket::{close as socket_close, open as socket_open, send_binary as socket_send_binary,
                  send_text as socket_send_text, SocketOpenOptions, SocketState};
use rtc::protocol::{DataRequest, JoinRequest, RtcEvent};
use rtc::RtcState;
use tauri::ipc::{Channel, Request};
use tauri::State;
#[cfg(target_os = "linux")]
use tauri::Manager;

const DISCOVERY_MIN_MS: f64 = 1_000.0;
const DISCOVERY_MAX_MS: f64 = 30_000.0;

async fn blocking<T: Send + 'static>(work: impl FnOnce() -> Result<T, String> + Send + 'static) -> Result<T, String> {
  tauri::async_runtime::spawn_blocking(work)
    .await
    .map_err(|e| format!("STORAGE_ERROR|{e}"))?
}

#[tauri::command]
async fn argus_discover(timeout_ms: f64) -> Result<net::Discovery, String> {
  let ms = if timeout_ms.is_finite() { timeout_ms.clamp(DISCOVERY_MIN_MS, DISCOVERY_MAX_MS) } else { DISCOVERY_MIN_MS };
  discover(Duration::from_millis(ms as u64)).await
}

#[tauri::command]
async fn argus_pair(
  app: tauri::AppHandle,
  host: String,
  ip: String,
  port: f64,
  code: String,
  expect: Option<PairExpectation>,
) -> Result<net::Pairing, String> {
  let port = u16::try_from(port as i64).map_err(|_| "HOST_NOT_ALLOWED|Invalid pairing port".to_string())?;
  pair(PairInput { host, ip, port, code, expect }, |change| net::confirm::trust_change(app, change)).await
}

#[tauri::command]
async fn argus_request(request: HttpRequest) -> Result<HttpResult, String> {
  let trust = blocking(net::trust::paired).await?;
  http_request(request, &trust).await
}

#[tauri::command]
async fn argus_relocate(url: String, ip: String) -> Result<(), String> {
  let trust = blocking(net::trust::paired).await?;
  http_probe(&url, &trust, &ip).await?;
  blocking(move || net::trust::relocate(&ip)).await
}

#[tauri::command]
async fn argus_secure_get(key: String) -> Result<Option<String>, String> {
  blocking(move || secure_get(&key)).await
}

#[tauri::command]
async fn argus_secure_set(key: String, value: String) -> Result<(), String> {
  blocking(move || secure_set(&key, &value)).await
}

#[tauri::command]
async fn argus_secure_delete(key: String) -> Result<(), String> {
  blocking(move || secure_delete(&key)).await
}

#[tauri::command]
async fn argus_socket_open(
  state: State<'_, SocketState>,
  options: SocketOpenOptions,
  on_event: Channel,
) -> Result<(), String> {
  socket_open(state, options, on_event).await
}

#[tauri::command]
fn argus_socket_send_text(state: State<'_, SocketState>, socket_id: String, message: String) -> Result<(), String> {
  socket_send_text(state, socket_id, message)
}

#[tauri::command]
fn argus_socket_send_binary(request: Request<'_>, state: State<'_, SocketState>) -> Result<(), String> {
  socket_send_binary(request, state)
}

#[tauri::command]
fn argus_socket_close(state: State<'_, SocketState>, socket_id: String, code: f64, reason: String) -> Result<(), String> {
  socket_close(state, socket_id, code, reason)
}

#[tauri::command]
async fn argus_rtc_join(
  state: State<'_, RtcState>,
  request: JoinRequest,
  on_event: Channel<RtcEvent>,
) -> Result<(), String> {
  rtc::join(&state, request, on_event).await
}

#[tauri::command]
async fn argus_rtc_microphone(state: State<'_, RtcState>, enabled: bool) -> Result<(), String> {
  rtc::set_microphone(&state, enabled).await
}

#[tauri::command]
async fn argus_rtc_send(state: State<'_, RtcState>, request: DataRequest) -> Result<(), String> {
  rtc::send(&state, request).await
}

#[tauri::command]
async fn argus_rtc_leave(state: State<'_, RtcState>) -> Result<(), String> {
  rtc::leave(&state).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let _ = rustls::crypto::ring::default_provider().install_default();
  rtc::transport::install();
  tauri::Builder::default()
    .plugin(context_menu::plugin())
    .manage(SocketState::default())
    .manage(RtcState::default())
    .setup(|app| {
      #[cfg(target_os = "linux")]
      if let Some(window) = app.get_webview_window("main") {
        window.with_webview(|webview| media::allow_app_microphone(&webview.inner()))?;
      }
      #[cfg(not(target_os = "linux"))]
      let _ = app;
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      argus_discover,
      argus_pair,
      argus_request,
      argus_relocate,
      argus_secure_get,
      argus_secure_set,
      argus_secure_delete,
      argus_socket_open,
      argus_socket_send_text,
      argus_socket_send_binary,
      argus_socket_close,
      argus_rtc_join,
      argus_rtc_microphone,
      argus_rtc_send,
      argus_rtc_leave,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
