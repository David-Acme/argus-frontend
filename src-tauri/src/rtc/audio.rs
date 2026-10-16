use std::borrow::Cow;
use std::path::{Path, PathBuf};

use livekit::webrtc::audio_frame::AudioFrame;
use livekit::webrtc::audio_source::native::NativeAudioSource;
use livekit::webrtc::audio_source::{AudioSourceOptions, RtcAudioSource};
use livekit::{PlatformAudio, PlayoutDeviceId, RecordingDeviceId};
use tokio::task::JoinHandle;

use super::protocol::{AudioDevice, AudioDirection};

pub const NATIVE_SAMPLE_RATE: u32 = 48_000;
pub const FRAME_SAMPLES: usize = (NATIVE_SAMPLE_RATE / 100) as usize;
const NATIVE_QUEUE_MS: u32 = 100;
const WAV_HEADER: usize = 44;
pub const FAKE_MIC_ENV: &str = "ARGUS_RTC_FAKE_MIC";

pub enum AudioChoice {
  Platform,
  File(PathBuf),
  #[cfg(test)]
  Synthetic,
}

pub enum AudioIo {
  Platform(PlatformAudio),
  Native { source: NativeAudioSource, feeder: Option<JoinHandle<()>> },
}

impl AudioChoice {
  pub fn from_environment() -> AudioChoice {
    std::env::var_os(FAKE_MIC_ENV).map_or(AudioChoice::Platform, |path| AudioChoice::File(PathBuf::from(path)))
  }
}

pub fn pcm16_samples(bytes: &[u8]) -> Vec<i16> {
  let body = if bytes.starts_with(b"RIFF") && bytes.len() > WAV_HEADER { &bytes[WAV_HEADER..] } else { bytes };
  body.as_chunks::<2>().0.iter().map(|pair| i16::from_le_bytes(*pair)).collect()
}

fn native_source() -> NativeAudioSource {
  NativeAudioSource::new(
    AudioSourceOptions { echo_cancellation: false, noise_suppression: false, auto_gain_control: false },
    NATIVE_SAMPLE_RATE,
    1,
    NATIVE_QUEUE_MS,
  )
}

pub async fn push_frame(source: &NativeAudioSource, samples: Vec<i16>) {
  let frame = AudioFrame {
    data: Cow::Owned(samples),
    sample_rate: NATIVE_SAMPLE_RATE,
    num_channels: 1,
    samples_per_channel: FRAME_SAMPLES as u32,
  };
  let _ = source.capture_frame(&frame).await;
}

fn loop_file(path: &Path) -> Result<AudioIo, String> {
  let samples = pcm16_samples(&std::fs::read(path).map_err(|error| format!("MIC_UNAVAILABLE|{error}"))?);
  if samples.is_empty() {
    return Err("MIC_UNAVAILABLE|The fake microphone file is empty".to_string());
  }
  let source = native_source();
  let feeder_source = source.clone();
  let feeder = tokio::spawn(async move {
    let mut offset = 0;
    loop {
      let frame = (0..FRAME_SAMPLES).map(|index| samples[(offset + index) % samples.len()]).collect();
      push_frame(&feeder_source, frame).await;
      offset = (offset + FRAME_SAMPLES) % samples.len();
    }
  });
  Ok(AudioIo::Native { source, feeder: Some(feeder) })
}

pub fn open(choice: AudioChoice) -> Result<AudioIo, String> {
  match choice {
    AudioChoice::Platform => PlatformAudio::new()
      .map(AudioIo::Platform)
      .map_err(|error| format!("MIC_UNAVAILABLE|{error}")),
    AudioChoice::File(path) => loop_file(&path),
    #[cfg(test)]
    AudioChoice::Synthetic => Ok(AudioIo::Native { source: native_source(), feeder: None }),
  }
}

pub fn device_list(entries: Vec<(String, String)>, selected: Option<&str>, direction: AudioDirection) -> Vec<AudioDevice> {
  entries
    .into_iter()
    .enumerate()
    .map(|(index, (id, name))| AudioDevice {
      active: selected.map_or(index == 0, |chosen| chosen == id),
      id,
      direction,
      name,
    })
    .collect()
}

impl AudioIo {
  pub fn devices(&self, input: Option<&str>, output: Option<&str>) -> Vec<AudioDevice> {
    let AudioIo::Platform(platform) = self else {
      return Vec::new();
    };
    let inputs = platform.recording_devices().map(|device| (device.id.to_string(), device.name)).collect();
    let outputs = platform.playout_devices().map(|device| (device.id.to_string(), device.name)).collect();
    let mut devices = device_list(inputs, input, AudioDirection::Input);
    devices.extend(device_list(outputs, output, AudioDirection::Output));
    devices
  }

  pub fn select(&self, direction: AudioDirection, id: &str) -> Result<(), String> {
    let AudioIo::Platform(platform) = self else {
      return Err("AUDIO_DEVICE_UNAVAILABLE|This call does not use the platform audio".to_string());
    };
    let result = match direction {
      AudioDirection::Input => platform.switch_recording_device(&RecordingDeviceId::from_unchecked_guid(id)),
      AudioDirection::Output => platform.switch_playout_device(&PlayoutDeviceId::from_unchecked_guid(id)),
    };
    result.map_err(|error| format!("AUDIO_DEVICE_UNAVAILABLE|{error}"))
  }

  pub fn rtc_source(&self) -> RtcAudioSource {
    match self {
      AudioIo::Platform(platform) => platform.rtc_source(),
      AudioIo::Native { source, .. } => RtcAudioSource::Native(source.clone()),
    }
  }

  #[cfg(test)]
  pub fn native_source(&self) -> Option<NativeAudioSource> {
    match self {
      AudioIo::Native { source, .. } => Some(source.clone()),
      AudioIo::Platform(_) => None,
    }
  }
}

impl Drop for AudioIo {
  fn drop(&mut self) {
    if let AudioIo::Native { feeder: Some(feeder), .. } = self {
      feeder.abort();
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn the_first_device_is_active_until_one_is_chosen() {
    let entries = || vec![("a".to_string(), "Built-in".to_string()), ("b".to_string(), "Headset".to_string())];
    let default = device_list(entries(), None, AudioDirection::Input);
    assert!(default[0].active && !default[1].active);
    let chosen = device_list(entries(), Some("b"), AudioDirection::Output);
    assert!(!chosen[0].active && chosen[1].active);
    assert_eq!(chosen[1].direction, AudioDirection::Output);
  }

  #[test]
  fn raw_and_wav_pcm_read_the_same_samples() {
    let raw = [0x01, 0x00, 0xff, 0x7f, 0x00, 0x80];
    assert_eq!(pcm16_samples(&raw), vec![1, i16::MAX, i16::MIN]);
    let mut wav = b"RIFF".to_vec();
    wav.resize(WAV_HEADER, 0);
    wav.extend_from_slice(&raw);
    assert_eq!(pcm16_samples(&wav), vec![1, i16::MAX, i16::MIN]);
    assert!(pcm16_samples(&[0x01]).is_empty());
  }
}
