package com.margelo.nitro.camera

import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.mediacodec.MediaCodecInfo
import androidx.media3.exoplayer.mediacodec.MediaCodecSelector

@UnstableApi
internal object PlatformFlacSelector : MediaCodecSelector {
  override fun getDecoderInfos(
    mimeType: String,
    requiresSecureDecoder: Boolean,
    requiresTunnelingDecoder: Boolean,
  ): List<MediaCodecInfo> {
    val infos =
      MediaCodecSelector.DEFAULT.getDecoderInfos(mimeType, requiresSecureDecoder, requiresTunnelingDecoder)
    if (mimeType != MimeTypes.AUDIO_FLAC)
      return infos
    val platform = infos.filter { !it.vendor }
    return platform.ifEmpty { infos }
  }
}
