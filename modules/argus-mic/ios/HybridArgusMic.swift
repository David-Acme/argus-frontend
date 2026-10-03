import Foundation
import AVFoundation
import NitroModules

public class HybridArgusMic: HybridArgusMicSpec {
  public var onData: Variant____pcm__Variant_NullType_ArrayBuffer______Void_NullType = .second(NullType())
  public var onError: Variant____code__String____message__String_____Void_NullType = .second(NullType())

  private let engine = AVAudioEngine()
  private var running = false

  public func start(sampleRate: Double) throws {
    guard !running else { return }
    guard engine.inputNode != nil else {
      DispatchQueue.main.async { self.onError.asType()?("MIC_UNAVAILABLE", "No audio input") }
      return
    }

    let format = engine.inputNode.outputFormat(forBus: 0)
    let targetRate = AVAudioFrameCount(max(8000, Int(sampleRate)))

    engine.inputNode.installTap(
      onBus: 0, bufferSize: 2048, format: format
    ) { [weak self] buffer, _ in
      guard let self else { return }
      let converter = AVAudioConverter(from: format, to: Self.targetFormat(rate: targetRate))
      var packet: AVAudioPacketCount = 1
      let input = AVAudioPCMBuffer(
        pcmFormat: format,
        bufferSize: AVAudioFrameCount(buffer.frameLength))
      input?.frameLength = buffer.frameLength
      input?.copy(from: buffer)

      let out = AVAudioPCMBuffer(pcmFormat: Self.targetFormat(rate: targetRate), bufferSize: 2048)
      var error: NSError?
      converter?.convert(to: out!, error: &error) { _, status in
        status.pointee = .haveData
        return input
      }
      guard let out, let channel = out.int16ChannelData?[0] else { return }
      let count = Int(out.frameLength)
      var bytes = Data(capacity: count * 2)
      for i in 0..<count {
        var sample = channel[i]
        bytes.append(UnsafeMutableBufferPointer(start: &sample, count: 1))
      }
      guard let chunk = try? ArrayBuffer.copy(data: bytes) else { return }
      DispatchQueue.main.async {
        self.onData.asType()?(.second(chunk))
      }
    }

    engine.prepare()
    do {
      try engine.start()
      running = true
    } catch {
      DispatchQueue.main.async { self.onError.asType()?("MIC_UNAVAILABLE", error.localizedDescription) }
    }
  }

  public func stop() throws {
    guard running else { return }
    engine.inputNode.removeTap(onBus: 0)
    engine.stop()
    running = false
    DispatchQueue.main.async {
      self.onData.asType()?(.first(NullType()))
    }
  }

  private static func targetFormat(rate: AVAudioFrameCount) -> AVAudioFormat {
    AVAudioFormat(
      commonFormat: .pcmFormatInt16,
      sampleRate: Double(rate),
      channels: 1,
      interleaved: false)!
  }
}