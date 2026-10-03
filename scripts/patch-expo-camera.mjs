import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const camera = join(root, 'node_modules', 'expo-camera');

function update(file, search, replacement, previousSearch = null) {
  const path = join(camera, file);
  const source = readFileSync(path, 'utf8');
  if (source.includes(replacement)) return;
  const anchor = source.includes(search) ? search : previousSearch;
  if (!anchor || !source.includes(anchor)) {
    throw new Error(`expo-camera patch anchor not found: ${file}`);
  }
  writeFileSync(path, source.replace(anchor, replacement));
}

if (!existsSync(camera)) process.exit(0);

update(
  'android/build.gradle',
  '  add(barcodeDependencyConfiguration, "com.google.mlkit:barcode-scanning:17.3.0")',
  '  add(barcodeDependencyConfiguration, "com.google.mlkit:barcode-scanning:17.3.0")\n  add(barcodeDependencyConfiguration, "com.google.mlkit:face-detection:16.1.7")',
);

update(
  'android/src/main/java/expo/modules/camera/common/CommonEvents.kt',
  ') : Record\n\n@OptimizedRecord\nclass CameraMountErrorEvent',
  ') : Record\n\n@OptimizedRecord\nclass FacesDetectedEvent(\n  @Field val target: Int,\n  @Field val data: Bundle\n) : Record\n\n@OptimizedRecord\nclass CameraMountErrorEvent',
);
update(
  'android/src/main/java/expo/modules/camera/CameraExceptions.kt',
  'class ImageCaptureFailed : CodedException(message = "Failed to capture image")',
  'class ImageCaptureFailed(message: String? = null) : CodedException(message ?: "Failed to capture image")',
);

const analyzerPath = join(
  camera,
  'android/src/main/java/expo/modules/camera/analyzers/FaceAnalyzer.kt',
);
writeFileSync(
  analyzerPath,
  `package expo.modules.camera.analyzers

import android.os.Bundle
import android.os.SystemClock
import androidx.annotation.OptIn
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.Face
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import kotlin.math.max

@OptIn(ExperimentalGetImage::class)
class FaceAnalyzer(private val onComplete: (Bundle) -> Unit) : ImageAnalysis.Analyzer {
  private val minAnalysisIntervalMs = 180L
  private val minPublishIntervalMs = 180L
  private val detector = FaceDetection.getClient(
    FaceDetectorOptions.Builder()
      .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
      .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
      .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
      .setMinFaceSize(0.1f)
      .build()
  )
  private var processing = false
  private var lastAnalyzedAt = 0L
  private var lastPublishedAt = 0L

  override fun analyze(imageProxy: ImageProxy) {
    val mediaImage = imageProxy.image
    val now = SystemClock.uptimeMillis()
    if (mediaImage == null || processing || now - lastAnalyzedAt < minAnalysisIntervalMs) {
      imageProxy.close()
      return
    }
    processing = true
    lastAnalyzedAt = now
    val rotation = imageProxy.imageInfo.rotationDegrees
    val width = if (rotation == 90 || rotation == 270) imageProxy.height else imageProxy.width
    val height = if (rotation == 90 || rotation == 270) imageProxy.width else imageProxy.height
    detector.process(InputImage.fromMediaImage(mediaImage, rotation))
      .addOnSuccessListener { faces ->
        val publishedAt = SystemClock.uptimeMillis()
        if (publishedAt - lastPublishedAt >= minPublishIntervalMs) {
          lastPublishedAt = publishedAt
          onComplete(toFrame(faces, width, height, imageProxy))
        }
      }
      .addOnCompleteListener {
        processing = false
        imageProxy.close()
      }
  }

  private fun toFrame(faces: List<Face>, width: Int, height: Int, imageProxy: ImageProxy): Bundle =
    Bundle().apply {
      putDouble("luminance", luminance(imageProxy))
      putParcelableArrayList("faces", ArrayList(faces.map { toFace(it, width, height) }))
    }

  private fun toFace(face: Face, width: Int, height: Int): Bundle = Bundle().apply {
    val bounds = face.boundingBox
    putBundle("bounds", Bundle().apply {
      putDouble("x", bounds.left.toDouble() / width)
      putDouble("y", bounds.top.toDouble() / height)
      putDouble("width", bounds.width().toDouble() / width)
      putDouble("height", bounds.height().toDouble() / height)
    })
    putDouble("yawDeg", face.headEulerAngleY.toDouble())
    putDouble("pitchDeg", face.headEulerAngleX.toDouble())
    putDouble("rollDeg", face.headEulerAngleZ.toDouble())
    putDouble("leftEyeOpenProbability", (face.leftEyeOpenProbability ?: 0f).toDouble())
    putDouble("rightEyeOpenProbability", (face.rightEyeOpenProbability ?: 0f).toDouble())
  }

  private fun luminance(imageProxy: ImageProxy): Double {
    val buffer = imageProxy.planes.firstOrNull()?.buffer?.duplicate() ?: return 0.0
    if (!buffer.hasRemaining()) return 0.0
    var sum = 0L
    var count = 0
    var index = 0
    while (buffer.hasRemaining()) {
      val value = buffer.get().toInt() and 0xFF
      if (index % max(1, buffer.capacity() / 256) == 0) {
        sum += value
        count += 1
      }
      index += 1
    }
    return if (count == 0) 0.0 else sum.toDouble() / count
  }
}
`,
);

update(
  'android/src/main/java/expo/modules/camera/ExpoCameraView.kt',
  'import expo.modules.camera.analyzers.BarcodeAnalyzer',
  'import expo.modules.camera.analyzers.BarcodeAnalyzer\nimport expo.modules.camera.analyzers.FaceAnalyzer',
);
update(
  'android/src/main/java/expo/modules/camera/ExpoCameraView.kt',
  'promise.reject(CameraExceptions.ImageCaptureFailed())',
  'Log.e(CameraViewModule.TAG, "Image capture failed: ${exception.imageCaptureError} ${exception.message}", exception)\n          promise.reject(CameraExceptions.ImageCaptureFailed("${exception.imageCaptureError}: ${exception.message ?: exception.javaClass.simpleName}"))',
  'Log.e(CameraViewModule.TAG, "Image capture failed: ${exception.imageCaptureError} ${exception.message}", exception)\n          promise.reject(CameraExceptions.ImageCaptureFailed(exception.message))',
);
update(
  'android/src/main/java/expo/modules/camera/ExpoCameraView.kt',
  'import expo.modules.camera.common.BarcodeScannedEvent',
  'import expo.modules.camera.common.BarcodeScannedEvent\nimport expo.modules.camera.common.FacesDetectedEvent',
);
update(
  'android/src/main/java/expo/modules/camera/ExpoCameraView.kt',
  '  private var shouldScanBarcodes = false',
  '  private var shouldScanBarcodes = false\n  private var shouldDetectFaces = false\n\n  private val onFacesDetected by EventDispatcher<FacesDetectedEvent>(\n    coalescingKey = { event -> (event.data.hashCode() % Short.MAX_VALUE).toShort() }\n  )',
);
update(
  'android/src/main/java/expo/modules/camera/ExpoCameraView.kt',
  '        if (shouldScanBarcodes && CameraUtils.isMLKitBarcodeScannerAvailable()) {',
  '        if (shouldDetectFaces) {\n          analyzer.setAnalyzer(\n            ContextCompat.getMainExecutor(context),\n            FaceAnalyzer { frame -> onFacesDetected(FacesDetectedEvent(id, frame)) }\n          )\n        } else if (shouldScanBarcodes && CameraUtils.isMLKitBarcodeScannerAvailable()) {',
);
update(
  'android/src/main/java/expo/modules/camera/ExpoCameraView.kt',
  '          .setResolutionStrategy(ResolutionStrategy.HIGHEST_AVAILABLE_STRATEGY)\n          .build()\n      )\n      .setBackpressureStrategy',
  '          .setResolutionStrategy(\n            ResolutionStrategy(\n              Size(1280, 720),\n              ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER\n            )\n          )\n          .build()\n      )\n      .setBackpressureStrategy',
);
update(
  'android/src/main/java/expo/modules/camera/ExpoCameraView.kt',
  '  private fun buildResolutionSelector(): ResolutionSelector {',
  '  fun setShouldDetectFaces(enabled: Boolean) {\n    if (shouldDetectFaces == enabled) return\n    shouldDetectFaces = enabled\n    shouldCreateCamera = true\n  }\n\n  private fun buildResolutionSelector(): ResolutionSelector {',
);
update(
  'android/src/main/java/expo/modules/camera/CameraViewModule.kt',
  '      Events(cameraEvents)\n',
  '      Events(cameraEvents)\n\n      Prop("faceDetectionEnabled") { view, enabled: Boolean? ->\n        view.setShouldDetectFaces(enabled == true)\n      }\n',
);
update(
  'src/Camera.types.ts',
  "export type ScanningResult = Omit<BarcodeScanningResult, 'bounds' | 'cornerPoints'>;",
  "export type ScanningResult = Omit<BarcodeScanningResult, 'bounds' | 'cornerPoints'>;\nexport type FaceDetectionFrame = { luminance: number; faces: Array<Record<string, unknown>> };",
);
update(
  'src/Camera.types.ts',
  '  onBarcodeScanned?: (scanningResult: BarcodeScanningResult) => void;',
  '  onBarcodeScanned?: (scanningResult: BarcodeScanningResult) => void;\n  faceDetectionEnabled?: boolean;\n  onFacesDetected?: (event: { nativeEvent: FaceDetectionFrame }) => void;',
);
update(
  'src/Camera.types.ts',
  '  onBarcodeScanned?: (event: { nativeEvent: BarcodeScanningResult }) => void;',
  '  onBarcodeScanned?: (event: { nativeEvent: BarcodeScanningResult }) => void;\n  faceDetectionEnabled?: boolean;\n  onFacesDetected?: (event: { nativeEvent: FaceDetectionFrame }) => void;',
);
update(
  'src/CameraView.tsx',
  '  render() {',
  '  _onFacesDetected = ({ nativeEvent }: { nativeEvent: any }) => {\n    this.props.onFacesDetected?.({ nativeEvent });\n  };\n\n  render() {',
);
update(
  'src/CameraView.tsx',
  '        onBarcodeScanned={onBarcodeScanned}',
  '        onBarcodeScanned={onBarcodeScanned}\n        onFacesDetected={this.props.onFacesDetected ? this._onFacesDetected : undefined}',
);
update(
  'build/Camera.types.d.ts',
  "export type ScanningResult = Omit<BarcodeScanningResult, 'bounds' | 'cornerPoints'>;",
  "export type ScanningResult = Omit<BarcodeScanningResult, 'bounds' | 'cornerPoints'>;\nexport type FaceDetectionFrame = {\n    luminance: number;\n    faces: Array<Record<string, unknown>>;\n};",
);
update(
  'build/Camera.types.d.ts',
  '    onBarcodeScanned?: (scanningResult: BarcodeScanningResult) => void;',
  '    onBarcodeScanned?: (scanningResult: BarcodeScanningResult) => void;\n    faceDetectionEnabled?: boolean;\n    onFacesDetected?: (event: {\n        nativeEvent: FaceDetectionFrame;\n    }) => void;',
);
update(
  'build/Camera.types.d.ts',
  '    onBarcodeScanned?: (event: {\n        nativeEvent: BarcodeScanningResult;\n    }) => void;',
  '    onBarcodeScanned?: (event: {\n        nativeEvent: BarcodeScanningResult;\n    }) => void;\n    faceDetectionEnabled?: boolean;\n    onFacesDetected?: (event: {\n        nativeEvent: FaceDetectionFrame;\n    }) => void;',
);
update(
  'build/CameraView.js',
  '    render() {',
  '    _onFacesDetected = ({ nativeEvent }) => {\n        this.props.onFacesDetected?.({ nativeEvent });\n    };\n    render() {',
);
update(
  'build/CameraView.js',
  'onBarcodeScanned: onBarcodeScanned, onAvailableLensesChanged:',
  'onBarcodeScanned: onBarcodeScanned, onFacesDetected: this.props.onFacesDetected ? this._onFacesDetected : undefined, onAvailableLensesChanged:',
);
console.log('expo-camera face frame analyzer patched');
