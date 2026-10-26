package com.davidacme.argus.push

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

internal data class EstelaStroke(val x0: Float, val y0: Float, val x1: Float, val y1: Float, val color: Int, val alpha: Float)

internal enum class EstelaMood { Idle, Alert }

internal object EstelaStill {
    private const val PARTICLES = 220
    private const val SEED = 7919L
    private const val MODULUS = 2_147_483_647L
    private const val MULTIPLIER = 16_807L
    private const val TRAIL = 0.15
    private const val SCALE = 0.42f
    private const val TILT = -0.25
    private const val IDLE_ALPHA = 0.8f
    private const val ALERT_ALPHA = 0.95f
    private const val DENSITY = 0.55f
    private const val ALERT_TINT = 0.5f
    private const val OPAQUE = -0x1000000
    private val sand = intArrayOf(242, 220, 178)
    private val amber = intArrayOf(255, 196, 110)
    private val indigo = intArrayOf(132, 122, 230)
    private val red = intArrayOf(244, 112, 84)

    fun strokes(sizePx: Int, mood: EstelaMood): List<EstelaStroke> {
        var seed = SEED
        val next = {
            seed = (seed * MULTIPLIER) % MODULUS
            (seed - 1).toDouble() / (MODULUS - 2)
        }
        val half = sizePx / 2f
        val scale = sizePx * SCALE
        val alpha = (if (mood == EstelaMood.Alert) ALERT_ALPHA else IDLE_ALPHA) * DENSITY
        return List(PARTICLES) {
            val u = next()
            val v = next() * 2 - 1
            val (hx, hy) = swirl(u, v, 0.0)
            val (tx, ty) = swirl(u, v, -TRAIL)
            EstelaStroke(
                x0 = half + (tx * scale).toFloat(),
                y0 = half + (ty * scale).toFloat(),
                x1 = half + (hx * scale).toFloat(),
                y1 = half + (hy * scale).toFloat(),
                color = colorFor(u, mood),
                alpha = alpha,
            )
        }
    }

    fun bitmap(sizePx: Int, mood: EstelaMood): Bitmap {
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeCap = Paint.Cap.ROUND
            strokeWidth = maxOf(1f, sizePx / 110f)
            xfermode = PorterDuffXfermode(PorterDuff.Mode.ADD)
        }
        strokes(sizePx, mood).forEach { stroke ->
            paint.color = stroke.color
            paint.alpha = (stroke.alpha * 255).roundToInt()
            canvas.drawLine(stroke.x0, stroke.y0, stroke.x1, stroke.y1, paint)
        }
        return bitmap
    }

    private fun swirl(u: Double, v: Double, turn: Double): Pair<Double, Double> {
        val th = 0.6 + u * 4.4 + turn
        val r = 0.1 + 0.8 * u
        val x = cos(th) * r * 1.15
        val y = sin(th) * r * 0.55
        val w = (0.08 * sin(PI * u) + 0.01) * v
        return Pair(x * cos(TILT) - y * sin(TILT) + w, x * sin(TILT) + y * cos(TILT) + w * 0.6)
    }

    private fun colorFor(u: Double, mood: EstelaMood): Int {
        val base = mix(sand, indigo, u.toFloat())
        val warm = mix(base, amber, 1f - min(1f, u.toFloat() * 1.4f))
        val tinted = if (mood == EstelaMood.Alert) mix(warm, red, ALERT_TINT) else warm
        return OPAQUE or (tinted[0] shl 16) or (tinted[1] shl 8) or tinted[2]
    }

    private fun mix(from: IntArray, to: IntArray, k: Float): IntArray =
        IntArray(3) { index -> (from[index] + (to[index] - from[index]) * k).roundToInt() }
}
