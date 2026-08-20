package com.margelo.nitro.face

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.gms.tasks.Task
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceLandmark as MKitFaceLandmark
import com.google.mlkit.vision.face.FaceDetection as MKitFaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import com.margelo.nitro.core.NullType
import com.margelo.nitro.core.Promise
import java.io.File
import java.net.URI
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

private suspend fun <T> Task<T>.await(): T =
  suspendCoroutine { cont ->
    addOnSuccessListener { cont.resume(it) }
    addOnFailureListener { cont.resumeWithException(it) }
  }

private fun toVariant(landmark: FaceLandmark?): Variant_NullType_FaceLandmark? =
  if (landmark != null) {
    Variant_NullType_FaceLandmark.create(landmark)
  } else {
    Variant_NullType_FaceLandmark.create(NullType.NULL)
  }

private fun averageLuminance(bitmap: Bitmap): Double {
  val width = bitmap.width
  val height = bitmap.height
  // Sample every 4th pixel; ~200k reads instead of full scan.
  val pixels = IntArray((width * height) / 16)
  val stride = width * 4
  var i = 0
  var y = 0
  while (y < height && i < pixels.size) {
    var x = 0
    while (x < width && i < pixels.size) {
      pixels[i] = bitmap.getPixel(x, y)
      i += 1
      x += 4
    }
    y += 4
  }
  var sum = 0L
  for (p in pixels) {
    val r = (p shr 16) and 0xFF
    val g = (p shr 8) and 0xFF
    val b = p and 0xFF
    sum += (r * 299 + g * 587 + b * 114) / 1000
  }
  return if (pixels.isEmpty()) 0.0 else sum.toDouble() / pixels.size
}

@DoNotStrip
class HybridArgusFace : HybridArgusFaceSpec() {

  // FAST mode + landmarks: guidance needs an updated box every frame, not
  // millimetre-accurate geometry. Eye-open probabilities come with
  // CLASSIFICATION_MODE_ALL.
  private val detector = MKitFaceDetection.getClient(
    FaceDetectorOptions.Builder()
      .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
      .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
      .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
      .setMinFaceSize(0.1f)
      .build(),
  )

  override fun detectFaces(jpegUri: String): Promise<FaceFrame> {
    return Promise.async {
      val path = URI(jpegUri).path
      val bitmap = BitmapFactory.decodeFile(path)
        ?: return@async FaceFrame(luminance = 0.0, faces = arrayOf())
      val w = bitmap.width.toFloat()
      val h = bitmap.height.toFloat()
      val faces = detector.process(InputImage.fromBitmap(bitmap, 0)).await()

      val mapped = faces.map { face ->
        val b = face.boundingBox
        val landmark = { id: Int ->
          face.getLandmark(id)?.position?.let { p ->
            FaceLandmark(x = (p.x / w).toDouble(), y = (p.y / h).toDouble())
          }
        }
        FaceDetection(
          bounds = FaceBounds(
            x = (b.left / w).toDouble(),
            y = (b.top / h).toDouble(),
            width = (b.width() / w).toDouble(),
            height = (b.height() / h).toDouble(),
          ),
          yawDeg = face.headEulerAngleY.toDouble(),
          pitchDeg = face.headEulerAngleX.toDouble(),
          rollDeg = face.headEulerAngleZ.toDouble(),
          leftEyeOpenProbability = (face.leftEyeOpenProbability ?: 0.0f).toDouble(),
          rightEyeOpenProbability = (face.rightEyeOpenProbability ?: 0.0f).toDouble(),
          leftEye = toVariant(landmark(MKitFaceLandmark.LEFT_EYE)),
          rightEye = toVariant(landmark(MKitFaceLandmark.RIGHT_EYE)),
          nose = toVariant(landmark(MKitFaceLandmark.NOSE_BASE)),
          mouth = toVariant(landmark(MKitFaceLandmark.MOUTH_BOTTOM)),
        )
      }.toTypedArray()

      FaceFrame(luminance = averageLuminance(bitmap), faces = mapped)
    }
  }
}