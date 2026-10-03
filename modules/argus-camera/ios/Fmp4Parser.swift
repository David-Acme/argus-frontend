import AVFoundation
import CoreMedia
import Foundation

final class Fmp4Parser {
  private(set) var formatDescription: CMVideoFormatDescription?
  private var timescale: Int64 = 0

  func reset() {
    formatDescription = nil
    timescale = 0
  }

  func consumeInit(_ data: Data) -> Bool {
    let top = Self.boxes(in: data, from: 0, to: data.count)
    guard let moov = top.first(where: { $0.type == "moov" }) else {
      return false
    }
    for trak in Self.boxes(in: data, from: moov.contentStart, to: moov.end)
    where trak.type == "trak" {
      parseTrack(data, trak)
    }
    return formatDescription != nil && timescale > 0
  }

  func parseFragment(_ data: Data, emit: (CMSampleBuffer) -> Void) {
    guard let formatDescription else { return }
    let top = Self.boxes(in: data, from: 0, to: data.count)
    guard let moof = top.first(where: { $0.type == "moof" }),
      let mdat = top.first(where: { $0.type == "mdat" }),
      let traf = Self.boxes(in: data, from: moof.contentStart, to: moof.end)
        .first(where: { $0.type == "traf" })
    else { return }

    var defaultDuration: UInt32 = 0
    var defaultSize: UInt32 = 0
    var defaultFlags: UInt32 = 0
    var baseDecodeTime: UInt64 = 0
    var dataOffset = 0
    var firstSampleFlags: UInt32?
    var samples: [Sample] = []

    for box in Self.boxes(in: data, from: traf.contentStart, to: traf.end) {
      switch box.type {
      case "tfhd":
        let flags = data.be32(box.contentStart) & 0x00FF_FFFF
        var offset = box.contentStart + 8
        if flags & 0x1 != 0 { offset += 8 }
        if flags & 0x2 != 0 { offset += 4 }
        if flags & 0x8 != 0 {
          defaultDuration = data.be32(offset)
          offset += 4
        }
        if flags & 0x10 != 0 {
          defaultSize = data.be32(offset)
          offset += 4
        }
        if flags & 0x20 != 0 {
          defaultFlags = data.be32(offset)
          offset += 4
        }
      case "tfdt":
        baseDecodeTime = data[box.contentStart] == 1
          ? data.be64(box.contentStart + 4)
          : UInt64(data.be32(box.contentStart + 4))
      case "trun":
        let flags = data.be32(box.contentStart) & 0x00FF_FFFF
        let count = Int(data.be32(box.contentStart + 4))
        var offset = box.contentStart + 8
        if flags & 0x1 != 0 {
          dataOffset = Int(Int32(bitPattern: data.be32(offset)))
          offset += 4
        }
        if flags & 0x4 != 0 {
          firstSampleFlags = data.be32(offset)
          offset += 4
        }
        for index in 0..<count {
          var duration = defaultDuration
          var size = defaultSize
          var sampleFlags = defaultFlags
          var compositionOffset: Int32 = 0
          if flags & 0x100 != 0 {
            duration = data.be32(offset)
            offset += 4
          }
          if flags & 0x200 != 0 {
            size = data.be32(offset)
            offset += 4
          }
          if flags & 0x400 != 0 {
            sampleFlags = data.be32(offset)
            offset += 4
          }
          if flags & 0x800 != 0 {
            compositionOffset = Int32(bitPattern: data.be32(offset))
            offset += 4
          }
          if index == 0, let first = firstSampleFlags {
            sampleFlags = first
          }
          samples.append(Sample(
            duration: duration,
            size: size,
            flags: sampleFlags,
            compositionOffset: compositionOffset))
        }
      default:
        break
      }
    }

    let start = dataOffset != 0 ? moof.start + dataOffset : mdat.contentStart
    var cursor = start
    var decodeTime = baseDecodeTime
    for sample in samples {
      let end = cursor + Int(sample.size)
      guard end <= data.count else { break }
      let sampleData = data.subdata(in: cursor..<end)
      cursor = end
      let notSync = (sample.flags & 0x0001_0000) != 0
      let presentation = CMTime(
        value: Int64(decodeTime) + Int64(sample.compositionOffset),
        timescale: CMTimeScale(timescale))
      if let buffer = Self.makeSampleBuffer(
        sampleData,
        formatDescription: formatDescription,
        presentationTime: presentation,
        duration: CMTime(
          value: Int64(sample.duration),
          timescale: CMTimeScale(timescale)),
        notSync: notSync)
      {
        emit(buffer)
      }
      decodeTime += UInt64(sample.duration)
    }
  }

  private struct Sample {
    let duration: UInt32
    let size: UInt32
    let flags: UInt32
    let compositionOffset: Int32
  }

  private struct Box {
    let type: String
    let start: Int
    let end: Int
    let contentStart: Int
  }

  private func parseTrack(_ data: Data, _ trak: Box) {
    guard let mdia = Self.boxes(in: data, from: trak.contentStart, to: trak.end)
      .first(where: { $0.type == "mdia" })
    else { return }
    let mdiaBoxes = Self.boxes(in: data, from: mdia.contentStart, to: mdia.end)
    if let mdhd = mdiaBoxes.first(where: { $0.type == "mdhd" }) {
      let version = data[mdhd.contentStart]
      let offset = version == 1 ? 20 : 12
      timescale = Int64(data.be32(mdhd.contentStart + offset))
    }
    guard let minf = mdiaBoxes.first(where: { $0.type == "minf" }),
      let stbl = Self.boxes(in: data, from: minf.contentStart, to: minf.end)
        .first(where: { $0.type == "stbl" }),
      let stsd = Self.boxes(in: data, from: stbl.contentStart, to: stbl.end)
        .first(where: { $0.type == "stsd" })
    else { return }
    for entry in Self.boxes(in: data, from: stsd.contentStart + 8, to: stsd.end)
    where entry.type == "avc1" || entry.type == "avc3" {
      for child in Self.boxes(
        in: data, from: entry.contentStart + 78, to: entry.end)
      where child.type == "avcC" {
        parseAvcC(data, child)
      }
    }
  }

  private func parseAvcC(_ data: Data, _ avcC: Box) {
    var offset = avcC.contentStart + 5
    guard offset < avcC.end else { return }
    let spsCount = Int(data[offset] & 0x1F)
    offset += 1
    var sets: [Data] = []
    for _ in 0..<spsCount {
      guard offset + 2 <= avcC.end else { return }
      let length = Int(data.be16(offset))
      offset += 2
      guard length > 0, offset + length <= avcC.end else { return }
      sets.append(data.subdata(in: offset..<offset + length))
      offset += length
    }
    guard offset < avcC.end else { return }
    let ppsCount = Int(data[offset])
    offset += 1
    for _ in 0..<ppsCount {
      guard offset + 2 <= avcC.end else { return }
      let length = Int(data.be16(offset))
      offset += 2
      guard length > 0, offset + length <= avcC.end else { return }
      sets.append(data.subdata(in: offset..<offset + length))
      offset += length
    }
    buildFormatDescription(sets)
  }

  private func buildFormatDescription(_ sets: [Data]) {
    guard !sets.isEmpty else { return }
    var pointers: [UnsafeMutablePointer<UInt8>] = []
    var sizes: [Int] = []
    for set in sets {
      let pointer = UnsafeMutablePointer<UInt8>.allocate(capacity: set.count)
      set.copyBytes(to: pointer, count: set.count)
      pointers.append(pointer)
      sizes.append(set.count)
    }
    defer { pointers.forEach { $0.deallocate() } }
    var description: CMVideoFormatDescription?
    let status = CMVideoFormatDescriptionCreateFromH264ParameterSets(
      allocator: kCFAllocatorDefault,
      parameterSetCount: pointers.count,
      parameterSetPointers: &pointers,
      parameterSetSizes: &sizes,
      nalUnitHeaderLength: 4,
      formatDescriptionOut: &description)
    if status == noErr {
      formatDescription = description
    }
  }

  private static func makeSampleBuffer(
    _ data: Data,
    formatDescription: CMVideoFormatDescription,
    presentationTime: CMTime,
    duration: CMTime,
    notSync: Bool
  ) -> CMSampleBuffer? {
    var blockBuffer: CMBlockBuffer?
    let length = data.count
    guard
      CMBlockBufferCreateWithMemoryBlock(
        allocator: kCFAllocatorDefault,
        memoryBlock: nil,
        blockLength: length,
        blockAllocator: kCFAllocatorDefault,
        customBlockSource: nil,
        offsetToData: 0,
        dataLength: length,
        flags: 0,
        blockBufferOut: &blockBuffer) == kCMBlockBufferNoErr,
      let block = blockBuffer
    else { return nil }
    let copied = data.withUnsafeBytes { raw -> OSStatus in
      guard let base = raw.baseAddress else { return -1 }
      return CMBlockBufferReplaceDataBytes(
        with: base,
        blockBuffer: block,
        offsetIntoDestination: 0,
        dataLength: length)
    }
    guard copied == kCMBlockBufferNoErr else { return nil }

    var timing = CMSampleTimingInfo(
      duration: duration,
      presentationTimeStamp: presentationTime,
      decodeTimeStamp: .invalid)
    var sampleSize = length
    var sampleBuffer: CMSampleBuffer?
    guard
      CMSampleBufferCreateReady(
        allocator: kCFAllocatorDefault,
        dataBuffer: block,
        formatDescription: formatDescription,
        sampleCount: 1,
        sampleTimingEntryCount: 1,
        sampleTimingArray: &timing,
        sampleSizeEntryCount: 1,
        sampleSizeArray: &sampleSize,
        sampleBufferOut: &sampleBuffer) == noErr,
      let buffer = sampleBuffer
    else { return nil }

    if notSync {
      let attachments = [[kCMSampleAttachmentKey_NotSync: true]] as CFArray
      CMSetAttachments(buffer, attachments, kCMSampleAttachmentModeShouldPropagate)
    }
    return buffer
  }

  private static func boxes(in data: Data, from: Int, to: Int) -> [Box] {
    var result: [Box] = []
    var offset = from
    while offset + 8 <= to {
      let size = Int(data.be32(offset))
      let type = String(
        bytes: data[offset + 4..<offset + 8],
        encoding: .ascii) ?? ""
      let end: Int
      if size == 1 && offset + 16 <= to {
        end = offset + Int(data.be64(offset + 8))
      } else if size == 0 {
        end = to
      } else {
        end = offset + size
      }
      guard end <= to, end > offset else { break }
      result.append(Box(
        type: type,
        start: offset,
        end: end,
        contentStart: size == 1 ? offset + 16 : offset + 8))
      offset = end
    }
    return result
  }
}

private extension Data {
  func be16(_ offset: Int) -> UInt16 {
    (UInt16(self[offset]) << 8) | UInt16(self[offset + 1])
  }

  func be32(_ offset: Int) -> UInt32 {
    (UInt32(self[offset]) << 24) | (UInt32(self[offset + 1]) << 16)
      | (UInt32(self[offset + 2]) << 8) | UInt32(self[offset + 3])
  }

  func be64(_ offset: Int) -> UInt64 {
    (UInt64(be32(offset)) << 32) | UInt64(be32(offset + 4))
  }
}
