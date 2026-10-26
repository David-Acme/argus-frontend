package com.davidacme.argus.push

import android.animation.ObjectAnimator
import android.animation.PropertyValuesHolder
import android.app.Activity
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.margelo.nitro.push.R

class CallActivity : Activity() {
    private var detachEnd: (() -> Unit)? = null
    private var pulse: ObjectAnimator? = null
    private val palette = CallPalette.STAGE
    private val scale by lazy { callStageScaleOf(resources.configuration.screenHeightDp) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showOverLockScreen()
        val callId = intent.getStringExtra(PushActions.EXTRA_CALL_ID)
        if (callId.isNullOrEmpty()) {
            finishAndRemoveTask()
            return
        }
        if (intent.action == PushActions.ACTION_ANSWER) {
            CallSession.answer(this, callId)
            finish()
            return
        }
        val display = CallSession.ringDisplay(callId)
        if (display == null) {
            finishAndRemoveTask()
            return
        }
        setContentView(stage(callId, display))
        detachEnd = CallSession.watchEnd(callId) { runOnUiThread { finishAndRemoveTask() } }
    }

    private fun showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        NativeTrace.record("screen", "held", "ring")
    }

    override fun onDestroy() {
        pulse?.cancel()
        detachEnd?.invoke()
        detachEnd = null
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        NativeTrace.record("screen", "released", "ring-ended")
        super.onDestroy()
    }

    private fun stage(callId: String, display: RingDisplay): View {
        val spanish = PushText.isSpanish()
        val root = FrameLayout(this).apply {
            setBackgroundColor(palette.background)
            ViewCompat.setOnApplyWindowInsetsListener(this) { view, insets ->
                val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                insets
            }
        }
        if (display.critical) root.addView(alertGlow(), FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(GLOW_DP)))
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(16), dp(scale.topDp), dp(16), dp(24))
        }
        column.addView(privateLine(spanish))
        column.addView(label(PushText.TITLE, palette.text, scale.titleSp, bold = true), spaced(8))
        column.addView(
            label(PushText.stageLine(spanish, display.critical, display.subject), palette.secondary, LINE_SP).apply {
                maxLines = 2
                ellipsize = TextUtils.TruncateAt.END
            },
            spaced(4),
        )
        column.addView(estela(display.critical), LinearLayout.LayoutParams(dp(scale.avatarDp), dp(scale.avatarDp)).apply { topMargin = dp(scale.avatarGapDp) })
        column.addView(View(this), LinearLayout.LayoutParams(0, 0, 1f))
        column.addView(controls(callId, display, spanish))
        root.addView(
            column,
            FrameLayout.LayoutParams(
                minOf(resources.displayMetrics.widthPixels, dp(MAX_WIDTH_DP)),
                ViewGroup.LayoutParams.MATCH_PARENT,
                Gravity.CENTER_HORIZONTAL,
            ),
        )
        NativeTrace.record("screen", "shown", if (display.critical) "ring-alert-stage" else "ring-stage")
        return root
    }

    private fun alertGlow(): View =
        View(this).apply {
            background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(palette.alertGlow, palette.background),
            )
        }

    private fun privateLine(spanish: Boolean): View =
        LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            addView(icon(R.drawable.argus_ic_lock, palette.secondary), LinearLayout.LayoutParams(dp(14), dp(14)).apply { marginEnd = dp(4) })
            addView(label(PushText.privateLine(spanish), palette.secondary, CAPTION_SP))
        }

    private fun estela(critical: Boolean): View {
        val estelaDp = (scale.avatarDp * ESTELA_FILL).toInt()
        val circle = FrameLayout(this).apply {
            background = oval(palette.surface)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
            addView(
                ImageView(this@CallActivity).apply {
                    setImageBitmap(EstelaStill.bitmap(dp(estelaDp), if (critical) EstelaMood.Alert else EstelaMood.Idle))
                },
                FrameLayout.LayoutParams(dp(estelaDp), dp(estelaDp), Gravity.CENTER),
            )
        }
        if (Settings.Global.getFloat(contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f) {
            pulse = ObjectAnimator.ofPropertyValuesHolder(
                circle,
                PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, PULSE_SCALE),
                PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, PULSE_SCALE),
            ).apply {
                duration = PULSE_MS
                repeatCount = ObjectAnimator.INFINITE
                repeatMode = ObjectAnimator.REVERSE
                start()
            }
        }
        return circle
    }

    private fun controls(callId: String, display: RingDisplay, spanish: Boolean): View =
        LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            ringChoices(display.critical, snoozable = false).forEach { choice ->
                addView(roundControl(choice, spanish) { choose(callId, choice) }, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            }
        }

    private fun choose(callId: String, choice: RingChoice) {
        when (choice) {
            RingChoice.Decline -> {
                CallSession.decline(this, callId)
                finishAndRemoveTask()
            }
            RingChoice.Answer -> {
                CallSession.answer(this, callId)
                finish()
            }
            RingChoice.Snooze -> Unit
        }
    }

    private fun roundControl(choice: RingChoice, spanish: Boolean, onTap: () -> Unit): View {
        val (glyph, fill, text) = when (choice) {
            RingChoice.Decline -> Triple(R.drawable.argus_ic_hang, palette.decline, PushText.decline(spanish))
            RingChoice.Snooze -> Triple(R.drawable.argus_ic_clock, palette.fill, PushText.snooze(spanish))
            RingChoice.Answer -> Triple(R.drawable.argus_ic_phone, palette.accept, PushText.answer(spanish))
        }
        val selectable = TypedValue()
        theme.resolveAttribute(android.R.attr.selectableItemBackgroundBorderless, selectable, true)
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            minimumHeight = dp(MIN_TOUCH_DP)
            isClickable = true
            isFocusable = true
            contentDescription = text
            setBackgroundResource(selectable.resourceId)
            addView(
                FrameLayout(this@CallActivity).apply {
                    background = oval(fill)
                    addView(icon(glyph, palette.text), FrameLayout.LayoutParams(dp(CONTROL_ICON_DP), dp(CONTROL_ICON_DP), Gravity.CENTER))
                },
                LinearLayout.LayoutParams(dp(scale.controlDp), dp(scale.controlDp)),
            )
            addView(label(text, palette.secondary, CAPTION_SP, bold = true), spaced(8))
            setOnClickListener { onTap() }
        }
    }

    private fun icon(resource: Int, tint: Int): ImageView =
        ImageView(this).apply {
            setImageResource(resource)
            setColorFilter(tint)
            importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
        }

    private fun label(text: String, color: Int, sp: Float, bold: Boolean = false): TextView =
        TextView(this).apply {
            this.text = text
            setTextColor(color)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
            gravity = Gravity.CENTER_HORIZONTAL
            if (bold) setTypeface(typeface, Typeface.BOLD)
        }

    private fun spaced(top: Int): LinearLayout.LayoutParams =
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(top) }

    private fun oval(color: Int): GradientDrawable = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(color)
    }

    private fun dp(value: Int): Int = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

    private companion object {
        const val MAX_WIDTH_DP = 480
        const val MIN_TOUCH_DP = 48
        const val ESTELA_FILL = 0.8f
        const val GLOW_DP = 420
        const val CONTROL_ICON_DP = 28
        const val PULSE_MS = 900L
        const val PULSE_SCALE = 1.04f
        const val LINE_SP = 15f
        const val CAPTION_SP = 13f
    }
}
