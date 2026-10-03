mod net;

use net::discover::discover;
use net::http::{request as http_request, HttpRequest, HttpResult};
use net::pair::pair;
use net::secure::{delete as secure_delete, get as secure_get, set as secure_set};
use net::socket::{close as socket_close, open as socket_open, send_binary as socket_send_binary,
                  send_text as socket_send_text, SocketOpenOptions, SocketState};
use tauri::ipc::{Channel, Request};
use tauri::State;

#[tauri::command]
async fn argus_discover(timeout_ms: f64) -> Result<net::Discovery, String> {
  let ms = timeout_ms.max(1000.0) as u64;
  discover(std::time::Duration::from_millis(ms)).await
}

#[tauri::command]
async fn argus_pair(host: String, ip: String, port: f64, code: String) -> Result<net::Pairing, String> {
  pair(&host, &ip, port as u16, &code).await
}

#[tauri::command]
async fn argus_request(request: HttpRequest, ip: Option<String>) -> Result<HttpResult, String> {
  let trust = net::trust::paired()?;
  let ip = ip.unwrap_or(trust.ip);
  http_request(request, &trust.ca_pem, &trust.host, &ip).await
}

#[tauri::command]
fn argus_secure_get(key: String) -> Result<Option<String>, String> {
  secure_get(&key)
}

#[tauri::command]
fn argus_secure_set(key: String, value: String) -> Result<(), String> {
  secure_set(&key, &value)
}

#[tauri::command]
fn argus_secure_delete(key: String) -> Result<(), String> {
  secure_delete(&key)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let _ = rustls::crypto::ring::default_provider().install_default();
  tauri::Builder::default()
    .manage(SocketState::default())
    .invoke_handler(tauri::generate_handler![
      argus_discover,
      argus_pair,
      argus_request,
      argus_secure_get,
      argus_secure_set,
      argus_secure_delete,
      argus_socket_open,
      argus_socket_send_text,
      argus_socket_send_binary,
      argus_socket_close,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
