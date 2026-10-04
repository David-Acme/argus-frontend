pub mod audio;
pub mod call;
pub mod protocol;
pub mod transport;

use std::sync::Arc;

use tauri::ipc::Channel;
use tokio::sync::Mutex;

use call::{AudioChoice, Call, CallOptions, EventSink};
use protocol::{pinned_url, DataRequest, JoinRequest, RtcEvent};

#[derive(Default)]
pub struct RtcState {
  call: Mutex<Option<Call>>,
}

fn channel_sink(channel: Channel<RtcEvent>) -> EventSink {
  Arc::new(move |event| {
    let _ = channel.send(event);
  })
}

pub async fn join(state: &RtcState, request: JoinRequest, on_event: Channel<RtcEvent>) -> Result<(), String> {
  let trust = tauri::async_runtime::spawn_blocking(crate::net::trust::paired)
    .await
    .map_err(|error| format!("STORAGE_ERROR|{error}"))??;
  let url = pinned_url(&request.url, &trust.host)?;
  let mut slot = state.call.lock().await;
  if let Some(previous) = slot.take() {
    previous.leave().await;
  }
  let call = Call::join(
    CallOptions {
      url,
      token: request.token,
      agent_identity: request.agent_identity,
      audio: AudioChoice::from_environment(),
    },
    channel_sink(on_event),
  )
  .await?;
  *slot = Some(call);
  Ok(())
}

pub async fn set_microphone(state: &RtcState, enabled: bool) -> Result<(), String> {
  let slot = state.call.lock().await;
  let call = slot.as_ref().ok_or_else(|| "RTC_NOT_CONNECTED|No call".to_string())?;
  call.set_microphone(enabled);
  Ok(())
}

pub async fn send(state: &RtcState, request: DataRequest) -> Result<(), String> {
  let slot = state.call.lock().await;
  let call = slot.as_ref().ok_or_else(|| "RTC_NOT_CONNECTED|No call".to_string())?;
  call.send(request.topic, request.payload).await
}

pub async fn leave(state: &RtcState) -> Result<(), String> {
  let previous = state.call.lock().await.take();
  if let Some(call) = previous {
    call.leave().await;
  }
  Ok(())
}
