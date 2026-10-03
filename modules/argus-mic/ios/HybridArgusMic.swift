import Foundation
import AVFoundation
import NitroModules

public class HybridArgusMic: HybridArgusMicSpec {
  public var onData: Variant____pcm__Variant_NullType_ArrayBuffer______Void_NullType = .second(NullType())
  public var onError: Variant____code__String____message__String_____Void_NullType = .second(NullType())
  public var onPlayerIdle: Variant_______Void_NullType = .second(NullType())

  private static let minimumRate: Double = 8000
  private static let tapSeconds: Double = 0.02

  private let engine = AVAudioEngine()
  private let playerNode = AVAudioPlayerNode()
  private let clock = PlayoutClock()
  private var graphReady = false
  private var capturing = false
  private var playerActive = false
  private var captureRate: Double = 16000
  private var playerFormat: AVAudioFormat?
  private var configurationObserver: NSObjectProtocol?

  deinit {
    if let configurationObserver {
      NotificationCenter.default.removeObserver(configurationObserver)
    }
  }

  public func start(sampleRate: Double) throws {
    guard !capturing else { return }
    captureRate = max(Self.minimumRate, sampleRate)
    do {
      try ensureEngine(playerRate: playerFormat?.sampleRate ?? captureRate)
      try installCaptureTap()
      capturing = true
    } catch {
      emitError("MIC_UNAVAILABLE", error.localizedDescription)
      releaseEngineIfUnused()
    }
  }

  public func stop() throws {
    guard capturing else { return }
    engine.inputNode.removeTap(onBus: 0)
    capturing = false
    releaseEngineIfUnused()
    DispatchQueue.main.async { [weak self] in
      guard let self, case .first(let callback) = self.onData else { return }
      callback(.first(NullType()))
    }
  }

  public func playerStart(sampleRate: Double) throws {
    guard !playerActive else { return }
    let rate = max(Self.minimumRate, sampleRate)
    do {
      try ensureEngine(playerRate: rate)
    } catch {
      emitError("PLAYER_UNAVAILABLE", error.localizedDescription)
      releaseEngineIfUnused()
      return
    }
    clock.reset(sampleRate: rate)
    playerNode.play()
    playerActive = true
  }

  public func playerWrite(pcm: ArrayBuffer) throws {
    guard playerActive, let format = playerFormat else { return }
    let data = pcm.toData(copyIfNeeded: true)
    let frames = data.count / 2
    guard frames > 0,
      let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(frames)),
      let channel = buffer.floatChannelData?[0]
    else { return }
    buffer.frameLength = AVAudioFrameCount(frames)
    data.withUnsafeBytes { raw in
      for index in 0..<frames {
        let sample = Int16(littleEndian: raw.loadUnaligned(fromByteOffset: index * 2, as: Int16.self))
        channel[index] = Float(sample) / 32768
      }
    }
    let count = Int64(frames)
    let generation = clock.scheduled(frames: count)
    playerNode.scheduleBuffer(buffer, completionCallbackType: .dataPlayedBack) { [weak self] _ in
      self?.bufferPlayed(frames: count, generation: generation)
    }
    if !playerNode.isPlaying && engine.isRunning {
      playerNode.play()
    }
  }

  public func playerFlush() throws {
    guard playerActive else { return }
    clock.flush()
    playerNode.stop()
    if engine.isRunning {
      playerNode.play()
    }
  }

  public func playerStop() throws {
    guard playerActive else { return }
    clock.flush()
    playerNode.stop()
    playerActive = false
    releaseEngineIfUnused()
  }

  public func playedSamples() throws -> Double {
    clock.playedFrames()
  }

  private func bufferPlayed(frames: Int64, generation: UInt64) {
    guard clock.played(frames: frames, generation: generation) else { return }
    DispatchQueue.main.async { [weak self] in
      guard let self, case .first(let callback) = self.onPlayerIdle else { return }
      callback()
    }
  }

  private func ensureEngine(playerRate: Double) throws {
    if !graphReady {
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playAndRecord, mode: .voiceChat, options: [.allowBluetooth, .defaultToSpeaker])
      try session.setActive(true)
      try? engine.inputNode.setVoiceProcessingEnabled(true)
      engine.attach(playerNode)
      observeConfigurationChanges()
      graphReady = true
    }
    if playerFormat?.sampleRate != playerRate {
      guard let format = AVAudioFormat(standardFormatWithSampleRate: playerRate, channels: 1) else {
        throw NSError(domain: "ArgusMic", code: 1, userInfo: [NSLocalizedDescriptionKey: "Unsupported playback format"])
      }
      engine.disconnectNodeOutput(playerNode)
      engine.connect(playerNode, to: engine.mainMixerNode, format: format)
      playerFormat = format
    }
    if !engine.isRunning {
      try AVAudioSession.sharedInstance().setActive(true)
      engine.prepare()
      try engine.start()
    }
  }

  private func installCaptureTap() throws {
    let input = engine.inputNode
    let inputFormat = input.outputFormat(forBus: 0)
    guard inputFormat.sampleRate > 0, inputFormat.channelCount > 0,
      let target = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: captureRate, channels: 1, interleaved: true),
      let converter = AVAudioConverter(from: inputFormat, to: target)
    else {
      throw NSError(domain: "ArgusMic", code: 2, userInfo: [NSLocalizedDescriptionKey: "No audio input"])
    }
    let tapFrames = AVAudioFrameCount(max(256, inputFormat.sampleRate * Self.tapSeconds))
    input.installTap(onBus: 0, bufferSize: tapFrames, format: inputFormat) { [weak self] buffer, _ in
      self?.emitConverted(buffer, converter: converter, target: target)
    }
  }

  private func emitConverted(_ buffer: AVAudioPCMBuffer, converter: AVAudioConverter, target: AVAudioFormat) {
    let ratio = target.sampleRate / buffer.format.sampleRate
    let capacity = AVAudioFrameCount((Double(buffer.frameLength) * ratio).rounded(.up)) + 64
    guard let output = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: capacity) else { return }
    var supplied = false
    var conversionError: NSError?
    let status = converter.convert(to: output, error: &conversionError) { _, inputStatus in
      if supplied {
        inputStatus.pointee = .noDataNow
        return nil
      }
      supplied = true
      inputStatus.pointee = .haveData
      return buffer
    }
    guard status != .error, output.frameLength > 0, let channel = output.int16ChannelData?[0] else { return }
    let data = Data(bytes: channel, count: Int(output.frameLength) * 2)
    guard let chunk = try? ArrayBuffer.copy(data: data) else { return }
    DispatchQueue.main.async { [weak self] in
      guard let self, case .first(let callback) = self.onData else { return }
      callback(.second(chunk))
    }
  }

  private func releaseEngineIfUnused() {
    guard !capturing, !playerActive else { return }
    if engine.isRunning {
      engine.stop()
    }
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  private func observeConfigurationChanges() {
    configurationObserver = NotificationCenter.default.addObserver(
      forName: .AVAudioEngineConfigurationChange, object: engine, queue: .main
    ) { [weak self] _ in
      self?.recoverAfterConfigurationChange()
    }
  }

  private func recoverAfterConfigurationChange() {
    guard capturing || playerActive else { return }
    if capturing {
      engine.inputNode.removeTap(onBus: 0)
    }
    do {
      if !engine.isRunning {
        engine.prepare()
        try engine.start()
      }
      if capturing {
        try installCaptureTap()
      }
      if playerActive {
        clock.flush()
        playerNode.play()
      }
    } catch {
      emitError("MIC_UNAVAILABLE", error.localizedDescription)
    }
  }

  private func emitError(_ code: String, _ message: String) {
    DispatchQueue.main.async { [weak self] in
      guard let self, case .first(let callback) = self.onError else { return }
      callback(code, message)
    }
  }
}
