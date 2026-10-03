package com.margelo.nitro.camera

import android.net.Uri
import androidx.media3.common.C
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.BaseDataSource
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DataSpec

@UnstableApi
internal class CameraDataSource(
  private val frames: CameraFrameBuffer,
) : BaseDataSource(false) {

  class Factory(private val frames: CameraFrameBuffer) : DataSource.Factory {
    override fun createDataSource(): DataSource = CameraDataSource(frames)
  }

  private var uri: Uri? = null

  override fun open(dataSpec: DataSpec): Long {
    uri = dataSpec.uri
    transferInitializing(dataSpec)
    transferStarted(dataSpec)
    return C.LENGTH_UNSET.toLong()
  }

  override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
    val count = frames.read(buffer, offset, length)
    if (count > 0)
      bytesTransferred(count)
    return count
  }

  override fun getUri(): Uri? = uri

  override fun close() {
    uri = null
    transferEnded()
  }

  companion object {
    val LIVE_URI: Uri = Uri.parse("argus-camera://live")
  }
}
