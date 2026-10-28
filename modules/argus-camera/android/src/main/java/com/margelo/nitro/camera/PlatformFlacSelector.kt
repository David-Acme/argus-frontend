package com.margelo.nitro.camera

import android.util.Log
import androidx.media3.common.MimeTypes
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.mediacodec.MediaCodecInfo
import androidx.media3.exoplayer.mediacodec.MediaCodecSelector

@UnstableApi
internal object PlatformFlacSelector : MediaCodecSelector {
  private val platformPrefixes = listOf("c2.android.", "OMX.google.")

  private fun isPlatform(info: MediaCodecInfo): Boolean =
    platformPrefixes.any { info.name.startsWith(it, ignoreCase = true) }

  override fun getDecoderInfos(
    mimeType: String,
    requiresSecureDecoder: Boolean,
    requiresTunnelingDecoder: Boolean,
  ): List<MediaCodecInfo> {
    val infos =
      MediaCodecSelector.DEFAULT.getDecoderInfos(mimeType, requiresSecureDecoder, requiresTunnelingDecoder)
    if (mimeType != MimeTypes.AUDIO_FLAC)
      return infos
    val ordered = infos.filter(::isPlatform) + infos.filterNot(::isPlatform)
    Log.i("ArgusCamera", "flac decoders in order: ${ordered.joinToString { it.name }}")
    return ordered
  }
}
