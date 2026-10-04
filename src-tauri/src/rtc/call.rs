use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use livekit::options::TrackPublishOptions;
use livekit::participant::Participant;
use livekit::publication::LocalTrackPublication;
use livekit::track::{LocalAudioTrack, LocalTrack, RemoteAudioTrack, RemoteTrack, TrackSource};
use livekit::webrtc::audio_stream::native::NativeAudioStream;
use livekit::{DataPacket, Room, RoomEvent, RoomOptions};
use tokio::sync::mpsc::UnboundedReceiver;
use tokio::task::JoinHandle;

pub use super::audio::AudioChoice;
use super::audio::AudioIo;
use super::protocol::{agent_state, end_reason, level, CallState, EndReason, RtcEvent, MICROPHONE_TRACK};

pub type EventSink = Arc<dyn Fn(RtcEvent) + Send + Sync>;

const LEVEL_INTERVAL: Duration = Duration::from_millis(66);
const LEVEL_SAMPLE_RATE: i32 = 24_000;

pub struct CallOptions {
  pub url: String,
  pub token: String,
  pub agent_identity: String,
  pub audio: AudioChoice,
}

pub struct Call {
  room: Arc<Room>,
  microphone: LocalTrackPublication,
  agent_identity: String,
  audio: AudioIo,
  events: JoinHandle<()>,
  closing: Arc<AtomicBool>,
}

struct EventLoop {
  room: Arc<Room>,
  agent_identity: String,
  sink: EventSink,
  remote_level: Option<JoinHandle<()>>,
  closing: Arc<AtomicBool>,
}

fn is_agent(participant: &Participant, agent_identity: &str) -> bool {
  participant.identity().as_str() == agent_identity
}

fn connect_error(error: livekit::RoomError) -> String {
  let text = error.to_string();
  if text.contains("401") || text.contains("403") || text.to_lowercase().contains("token") {
    format!("RTC_UNAUTHORIZED|{text}")
  } else {
    format!("RTC_UNAVAILABLE|{text}")
  }
}

impl EventLoop {
  fn emit(&self, event: RtcEvent) {
    (self.sink)(event);
  }

  fn ended(&self, reason: EndReason) -> EndReason {
    if self.closing.load(Ordering::Acquire) {
      EndReason::Local
    } else {
      reason
    }
  }

  fn announce_agent(&self, participant: &Participant) {
    self.emit(RtcEvent::Agent {
      identity: participant.identity().to_string(),
      state: agent_state(&participant.attributes()),
    });
  }

  fn follow_agent_audio(&mut self, track: RemoteAudioTrack) {
    if let Some(previous) = self.remote_level.take() {
      previous.abort();
    }
    let sink = self.sink.clone();
    let room = self.room.clone();
    self.emit(RtcEvent::AgentAudio { active: true });
    self.remote_level = Some(tokio::spawn(async move {
      let mut stream = NativeAudioStream::new(track.rtc_track(), LEVEL_SAMPLE_RATE, 1);
      let mut last = Instant::now();
      let mut peak = 0.0_f32;
      while let Some(frame) = stream.next().await {
        peak = peak.max(level(&frame.data));
        if last.elapsed() < LEVEL_INTERVAL {
          continue;
        }
        last = Instant::now();
        sink(RtcEvent::Level { local: room.local_participant().audio_level(), remote: peak });
        peak = 0.0;
      }
    }));
  }

  fn drop_agent_audio(&mut self) {
    if let Some(previous) = self.remote_level.take() {
      previous.abort();
    }
    self.emit(RtcEvent::AgentAudio { active: false });
  }

  fn handle(&mut self, event: RoomEvent) -> bool {
    match event {
      RoomEvent::ParticipantConnected(participant) => {
        let participant = Participant::Remote(participant);
        if is_agent(&participant, &self.agent_identity) {
          self.announce_agent(&participant);
        }
      }
      RoomEvent::ParticipantAttributesChanged { participant, .. } => {
        if is_agent(&participant, &self.agent_identity) {
          self.announce_agent(&participant);
        }
      }
      RoomEvent::ParticipantDisconnected(participant) => {
        if participant.identity().as_str() == self.agent_identity {
          self.drop_agent_audio();
          self.emit(RtcEvent::Agent { identity: self.agent_identity.clone(), state: None });
        }
      }
      RoomEvent::TrackSubscribed { track: RemoteTrack::Audio(track), participant, .. } => {
        if participant.identity().as_str() == self.agent_identity {
          self.follow_agent_audio(track);
        }
      }
      RoomEvent::TrackUnsubscribed { track: RemoteTrack::Audio(_), participant, .. } => {
        if participant.identity().as_str() == self.agent_identity {
          self.drop_agent_audio();
        }
      }
      RoomEvent::DataReceived { payload, topic: Some(topic), participant: Some(participant), .. } => {
        if participant.identity().as_str() == self.agent_identity {
          if let Ok(text) = String::from_utf8(payload.to_vec()) {
            self.emit(RtcEvent::Data { topic, payload: text });
          }
        }
      }
      RoomEvent::Reconnecting => self.emit(RtcEvent::State { state: CallState::Reconnecting, reason: None }),
      RoomEvent::Reconnected => self.emit(RtcEvent::State { state: CallState::Connected, reason: None }),
      RoomEvent::Disconnected { reason } => {
        self.drop_agent_audio();
        let reason = self.ended(end_reason(reason));
        self.emit(RtcEvent::State { state: CallState::Disconnected, reason: Some(reason) });
        return false;
      }
      _ => {}
    }
    true
  }

  async fn run(mut self, mut events: UnboundedReceiver<RoomEvent>) {
    while let Some(event) = events.recv().await {
      if !self.handle(event) {
        return;
      }
    }
    self.drop_agent_audio();
    let reason = self.ended(EndReason::Lost);
    self.emit(RtcEvent::State { state: CallState::Disconnected, reason: Some(reason) });
  }
}

impl Call {
  pub async fn join(options: CallOptions, sink: EventSink) -> Result<Call, String> {
    sink(RtcEvent::State { state: CallState::Connecting, reason: None });
    let audio = super::audio::open(options.audio)?;
    let mut room_options = RoomOptions::default();
    room_options.auto_subscribe = true;
    let (room, events) = Room::connect(&options.url, &options.token, room_options)
      .await
      .map_err(connect_error)?;
    let room = Arc::new(room);

    let track = LocalAudioTrack::create_audio_track(MICROPHONE_TRACK, audio.rtc_source());
    let publish = TrackPublishOptions { source: TrackSource::Microphone, dtx: true, red: true, ..Default::default() };
    let microphone = match room.local_participant().publish_track(LocalTrack::Audio(track), publish).await {
      Ok(publication) => publication,
      Err(error) => {
        let _ = room.close().await;
        return Err(format!("MIC_UNAVAILABLE|{error}"));
      }
    };

    let closing = Arc::new(AtomicBool::new(false));
    let mut event_loop = EventLoop {
      room: room.clone(),
      agent_identity: options.agent_identity.clone(),
      sink: sink.clone(),
      remote_level: None,
      closing: closing.clone(),
    };
    sink(RtcEvent::State { state: CallState::Connected, reason: None });
    if let Some(agent) = room
      .remote_participants()
      .into_values()
      .find(|participant| participant.identity().as_str() == options.agent_identity)
    {
      event_loop.announce_agent(&Participant::Remote(agent.clone()));
      for publication in agent.track_publications().into_values() {
        if let Some(RemoteTrack::Audio(track)) = publication.track() {
          event_loop.follow_agent_audio(track);
        }
      }
    }
    let events = tokio::spawn(event_loop.run(events));

    Ok(Call { room, microphone, agent_identity: options.agent_identity, audio, events, closing })
  }

  pub fn set_microphone(&self, enabled: bool) {
    if enabled {
      self.microphone.unmute();
    } else {
      self.microphone.mute();
    }
  }

  pub async fn send(&self, topic: String, payload: String) -> Result<(), String> {
    self
      .room
      .local_participant()
      .publish_data(DataPacket {
        payload: payload.into_bytes(),
        topic: Some(topic),
        reliable: true,
        destination_identities: vec![self.agent_identity.clone().into()],
      })
      .await
      .map_err(|error| format!("RTC_SEND_FAILED|{error}"))
  }

  #[cfg(test)]
  pub fn synthetic_source(&self) -> Option<livekit::webrtc::audio_source::native::NativeAudioSource> {
    self.audio.native_source()
  }

  pub async fn leave(self) {
    self.closing.store(true, Ordering::Release);
    let _ = self.room.close().await;
    let _ = tokio::time::timeout(Duration::from_secs(2), self.events).await;
    drop(self.audio);
  }
}

#[cfg(test)]
mod live_tests {
  use std::collections::HashMap;
  use std::f32::consts::TAU;
  use std::sync::Mutex;

  use livekit::webrtc::audio_source::native::NativeAudioSource;
  use livekit::webrtc::audio_source::{AudioSourceOptions, RtcAudioSource};

  use super::super::audio::{pcm16_samples, push_frame as push, FRAME_SAMPLES, NATIVE_SAMPLE_RATE as SYNTHETIC_SAMPLE_RATE};
  use super::*;

  const SYNTHETIC_QUEUE_MS: u32 = 100;
  const TONE_HZ: f32 = 440.0;
  const TONE_AMPLITUDE: f32 = 9_000.0;
  const AGENT: &str = "argus-voice";

  struct Live {
    url: String,
    user_token: String,
    agent_token: String,
    clip: Option<Vec<i16>>,
  }

  fn live() -> Option<Live> {
    let clip = std::env::var("ARGUS_RTC_TEST_CLIP").ok().map(|path| read_pcm16(&path));
    Some(Live {
      url: std::env::var("ARGUS_RTC_TEST_URL").ok()?,
      user_token: std::env::var("ARGUS_RTC_TEST_USER_TOKEN").ok()?,
      agent_token: std::env::var("ARGUS_RTC_TEST_AGENT_TOKEN").ok()?,
      clip,
    })
  }

  fn read_pcm16(path: &str) -> Vec<i16> {
    pcm16_samples(&std::fs::read(path).expect("clip readable"))
  }

  fn tone(offset: usize) -> Vec<i16> {
    (0..FRAME_SAMPLES)
      .map(|index| {
        let t = (offset + index) as f32 / SYNTHETIC_SAMPLE_RATE as f32;
        ((TAU * TONE_HZ * t).sin() * TONE_AMPLITUDE) as i16
      })
      .collect()
  }

  async fn wait_for(events: &Arc<Mutex<Vec<RtcEvent>>>, what: impl Fn(&RtcEvent) -> bool) -> bool {
    let deadline = Instant::now() + Duration::from_secs(15);
    while Instant::now() < deadline {
      if events.lock().unwrap().iter().any(&what) {
        return true;
      }
      tokio::time::sleep(Duration::from_millis(50)).await;
    }
    false
  }

  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  #[ignore = "needs a real /rtc/token grant in ARGUS_RTC_GRANT_* and a fake microphone clip"]
  async fn a_real_call_with_argus_voice() {
    let (Ok(url), Ok(token), Ok(agent), Ok(ca), Ok(clip)) = (
      std::env::var("ARGUS_RTC_GRANT_URL"),
      std::env::var("ARGUS_RTC_GRANT_TOKEN"),
      std::env::var("ARGUS_RTC_GRANT_AGENT"),
      std::env::var("ARGUS_RTC_TEST_CA"),
      std::env::var("ARGUS_RTC_TEST_CLIP"),
    ) else {
      return;
    };
    let seconds = std::env::var("ARGUS_RTC_CALL_SECONDS").ok().and_then(|value| value.parse().ok()).unwrap_or(30);
    let _ = rustls::crypto::ring::default_provider().install_default();
    crate::net::trust::seed(crate::net::trust::Trust {
      ca_pem: std::fs::read_to_string(ca).expect("CA readable"),
      host: "argus.local".to_string(),
      ip: "127.0.0.1".to_string(),
    });
    super::super::transport::install();
    let url = super::super::protocol::pinned_url(&url, "argus.local").expect("pinned url");
    let started = Instant::now();
    let call = Call::join(
      CallOptions { url, token, agent_identity: agent, audio: AudioChoice::File(clip.into()) },
      Arc::new(move |event| match &event {
        RtcEvent::Level { .. } => {}
        other => println!("{:>6} ms {}", started.elapsed().as_millis(), serde_json::to_string(other).unwrap()),
      }),
    )
    .await
    .expect("joins the call");
    tokio::time::sleep(Duration::from_secs(seconds)).await;
    call.send("argus.hangup".to_string(), "{}".to_string()).await.ok();
    call.leave().await;
  }

  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  #[ignore = "needs a LiveKit TLS front, the instance CA and tokens in ARGUS_RTC_TEST_*"]
  async fn a_call_dials_livekit_through_the_pinned_tls_front() {
    let (Some(live), Ok(tls_url), Ok(ca)) =
      (live(), std::env::var("ARGUS_RTC_TEST_TLS_URL"), std::env::var("ARGUS_RTC_TEST_CA"))
    else {
      return;
    };
    let _ = rustls::crypto::ring::default_provider().install_default();
    crate::net::trust::seed(crate::net::trust::Trust {
      ca_pem: std::fs::read_to_string(ca).expect("CA readable"),
      host: "argus.local".to_string(),
      ip: "127.0.0.1".to_string(),
    });
    super::super::transport::install();
    let url = super::super::protocol::pinned_url(&tls_url, "argus.local").expect("pinned url");
    let events = Arc::new(Mutex::new(Vec::<RtcEvent>::new()));
    let recorded = events.clone();
    let started = Instant::now();
    let call = Call::join(
      CallOptions { url, token: live.user_token, agent_identity: AGENT.to_string(), audio: AudioChoice::Synthetic },
      Arc::new(move |event| recorded.lock().unwrap().push(event)),
    )
    .await
    .expect("user joins through the pinned front");
    println!("joined through the pinned TLS front in {:?}", started.elapsed());
    assert!(events.lock().unwrap().contains(&RtcEvent::State { state: CallState::Connected, reason: None }));
    call.leave().await;
    let unexpected = events.lock().unwrap().iter().any(|event| {
      matches!(event, RtcEvent::State { state: CallState::Disconnected, reason: Some(reason) } if *reason != EndReason::Local)
    });
    assert!(!unexpected, "a local leave is not reported as a lost call");
  }

  #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
  #[ignore = "needs a LiveKit server and tokens in ARGUS_RTC_TEST_*"]
  async fn a_call_hears_the_agent_and_carries_data_both_ways() {
    let Some(live) = live() else { return };

    let (agent_room, mut agent_events) = Room::connect(&live.url, &live.agent_token, RoomOptions::default())
      .await
      .expect("agent joins");
    let agent_source = NativeAudioSource::new(
      AudioSourceOptions { echo_cancellation: false, noise_suppression: false, auto_gain_control: false },
      SYNTHETIC_SAMPLE_RATE,
      1,
      SYNTHETIC_QUEUE_MS,
    );
    let agent_track = LocalAudioTrack::create_audio_track(AGENT, RtcAudioSource::Native(agent_source.clone()));
    agent_room
      .local_participant()
      .publish_track(
        LocalTrack::Audio(agent_track),
        TrackPublishOptions { source: TrackSource::Microphone, ..Default::default() },
      )
      .await
      .expect("agent publishes");
    let clip = live.clip.clone();
    let speaker = tokio::spawn(async move {
      let mut offset = 0;
      loop {
        let samples = match &clip {
          Some(clip) if !clip.is_empty() => {
            let start = offset % clip.len();
            (0..FRAME_SAMPLES).map(|index| clip[(start + index) % clip.len()]).collect()
          }
          _ => tone(offset),
        };
        push(&agent_source, samples).await;
        offset += FRAME_SAMPLES;
      }
    });

    let events = Arc::new(Mutex::new(Vec::<RtcEvent>::new()));
    let recorded = events.clone();
    let started = Instant::now();
    let call = Call::join(
      CallOptions {
        url: live.url.clone(),
        token: live.user_token.clone(),
        agent_identity: AGENT.to_string(),
        audio: AudioChoice::Synthetic,
      },
      Arc::new(move |event| recorded.lock().unwrap().push(event)),
    )
    .await
    .expect("user joins");
    let joined_in = started.elapsed();
    let user_source = call.synthetic_source().expect("synthetic microphone");
    let user_speaker = tokio::spawn(async move {
      let mut offset = 0;
      loop {
        push(&user_source, tone(offset)).await;
        offset += FRAME_SAMPLES;
      }
    });

    if let Err(error) = agent_room
      .local_participant()
      .set_attributes(HashMap::from([("lk.agent.state".to_string(), "speaking".to_string())]))
      .await
    {
      println!("set_attributes answered {error}; the update may still apply");
    }

    assert!(wait_for(&events, |event| matches!(event, RtcEvent::State { state: CallState::Connected, .. })).await);
    assert!(
      wait_for(&events, |event| matches!(event, RtcEvent::Agent { state: Some(state), .. } if state == "speaking")).await,
      "agent state reaches the app"
    );
    let heard_at = Instant::now();
    assert!(
      wait_for(&events, |event| matches!(event, RtcEvent::Level { remote, .. } if *remote > 0.05)).await,
      "the agent's audio is heard"
    );
    let heard_in = heard_at.elapsed();

    let mut user_identity = String::new();
    let mut user_heard = false;
    let user_deadline = Instant::now() + Duration::from_secs(15);
    while Instant::now() < user_deadline && (user_identity.is_empty() || !user_heard) {
      if let Ok(Some(event)) = tokio::time::timeout(Duration::from_millis(200), agent_events.recv()).await {
        match event {
          RoomEvent::ParticipantConnected(participant) => user_identity = participant.identity().to_string(),
          RoomEvent::TrackSubscribed { participant, .. } => {
            user_identity = participant.identity().to_string();
            user_heard = true;
          }
          _ => {}
        }
      }
    }
    assert!(user_heard, "the agent subscribes to the user's microphone");

    agent_room
      .local_participant()
      .publish_data(DataPacket {
        payload: br#"{"text":"hola","final":true}"#.to_vec(),
        topic: Some("argus.stt".to_string()),
        reliable: true,
        destination_identities: vec![user_identity.clone().into()],
      })
      .await
      .expect("agent sends data");
    assert!(
      wait_for(&events, |event| matches!(event, RtcEvent::Data { topic, payload } if topic == "argus.stt" && payload.contains("hola"))).await,
      "agent data reaches the app"
    );

    call.send("argus.context".to_string(), r#"{"kind":"note","text":"Patio"}"#.to_string()).await.expect("app sends");
    let mut context = None;
    let mut muted = false;
    call.set_microphone(false);
    let data_deadline = Instant::now() + Duration::from_secs(15);
    while Instant::now() < data_deadline && (context.is_none() || !muted) {
      if let Ok(Some(event)) = tokio::time::timeout(Duration::from_millis(200), agent_events.recv()).await {
        match event {
          RoomEvent::DataReceived { payload, topic, .. } => {
            context = Some((topic, String::from_utf8(payload.to_vec()).unwrap()));
          }
          RoomEvent::TrackMuted { .. } => muted = true,
          _ => {}
        }
      }
    }
    assert_eq!(context, Some((Some("argus.context".to_string()), r#"{"kind":"note","text":"Patio"}"#.to_string())));
    assert!(muted, "muting reaches the room");

    let remote_peak = events
      .lock()
      .unwrap()
      .iter()
      .filter_map(|event| match event {
        RtcEvent::Level { remote, .. } => Some(*remote),
        _ => None,
      })
      .fold(0.0_f32, f32::max);
    println!("joined in {joined_in:?}, agent audio heard {heard_in:?} after its state, remote peak level {remote_peak:.2}");

    user_speaker.abort();
    call.leave().await;
    let mut left = false;
    let leave_deadline = Instant::now() + Duration::from_secs(10);
    while Instant::now() < leave_deadline && !left {
      if let Ok(Some(RoomEvent::ParticipantDisconnected(_))) =
        tokio::time::timeout(Duration::from_millis(200), agent_events.recv()).await
      {
        left = true;
      }
    }
    assert!(left, "leaving removes the user from the room");
    speaker.abort();
    let _ = agent_room.close().await;
  }
}
