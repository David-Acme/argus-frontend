package com.davidacme.argus.push

import android.animation.ObjectAnimator
import android.app.Activity
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
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

class CallActivity : Activity() {
    private var detachEnd: (() -> Unit)? = null
    private val handler = Handler(Looper.getMainLooper())
    private var statusView: TextView? = null
    private var ticker: Runnable? = null
    private var pulse: ObjectAnimator? = null

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
        setContentView(callLayout(callId, display))
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
        ticker?.let { handler.removeCallbacks(it) }
        pulse?.cancel()
        detachEnd?.invoke()
        detachEnd = null
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        NativeTrace.record("screen", "released", "ring-ended")
        super.onDestroy()
    }

    private fun callLayout(callId: String, display: RingDisplay): View {
        val spanish = PushText.isSpanish()
        val palette = CallPalette.of(isNight())
        val root = FrameLayout(this).apply {
            setBackgroundColor(palette.background)
            ViewCompat.setOnApplyWindowInsetsListener(this) { view, insets ->
                val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
                insets
            }
        }
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(24), dp(16), dp(24), dp(32))
            layoutParams = FrameLayout.LayoutParams(
                minOf(resources.displayMetrics.widthPixels, dp(MAX_WIDTH_DP)),
                ViewGroup.LayoutParams.MATCH_PARENT,
                Gravity.CENTER_HORIZONTAL,
            )
        }
        column.addView(
            label(
                if (display.critical) PushText.criticalTitle(spanish) else PushText.incomingTitle(spanish),
                if (display.critical) palette.decline else palette.secondary,
                LABEL_SP,
            ),
        )
        column.addView(emblem(palette), LinearLayout.LayoutParams(dp(EMBLEM_DP), dp(EMBLEM_DP)).apply { topMargin = dp(20) })
        column.addView(
            label(display.reason.ifEmpty { PushText.TITLE }, palette.text, TITLE_SP).apply {
                gravity = Gravity.CENTER
                setPadding(0, dp(20), 0, 0)
            },
        )
        val status = label(
            PushText.ringStatus(spanish, PushText.clock(0L)),
            palette.secondary,
            STATUS_SP,
        ).apply { setPadding(0, dp(8), 0, 0) }
        statusView = status
        column.addView(status)
        startTicker(display.startedAtMillis, spanish)
        column.addView(View(this), LinearLayout.LayoutParams(0, 0, 1f))
        column.addView(controls(callId, palette, spanish))
        root.addView(column)
        return root
    }

    private fun emblem(palette: CallPalette): View {
        val circle = FrameLayout(this).apply {
            background = oval(palette.emblem)
            addView(
                ImageView(this@CallActivity).apply {
                    setImageResource(applicationInfo.icon)
                    scaleType = ImageView.ScaleType.FIT_CENTER
                },
                FrameLayout.LayoutParams(dp(EMBLEM_ICON_DP), dp(EMBLEM_ICON_DP), Gravity.CENTER),
            )
        }
        if (Settings.Global.getFloat(contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f) {
            pulse = ObjectAnimator.ofPropertyValuesHolder(
                circle,
                android.animation.PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, PULSE_SCALE),
                android.animation.PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, PULSE_SCALE),
            ).apply {
                duration = PULSE_MS
                repeatCount = ObjectAnimator.INFINITE
                repeatMode = ObjectAnimator.REVERSE
                start()
            }
        }
        return circle
    }

    private fun controls(callId: String, palette: CallPalette, spanish: Boolean): View =
        LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            addView(
                roundControl(
                    android.R.drawable.ic_menu_close_clear_cancel,
                    palette.decline,
                    PushText.decline(spanish),
                ) {
                    CallSession.decline(this@CallActivity, callId)
                    finishAndRemoveTask()
                },
                LinearLayout.LayoutParams(dp(CONTROL_WIDTH_DP), ViewGroup.LayoutParams.WRAP_CONTENT).apply { setMargins(dp(12), 0, dp(12), 0) },
            )
            addView(
                roundControl(
                    android.R.drawable.ic_menu_call,
                    palette.accept,
                    PushText.answer(spanish),
                ) {
                    CallSession.answer(this@CallActivity, callId)
                    finish()
                },
                LinearLayout.LayoutParams(dp(CONTROL_WIDTH_DP), ViewGroup.LayoutParams.WRAP_CONTENT).apply { setMargins(dp(12), 0, dp(12), 0) },
            )
        }

    private fun roundControl(icon: Int, color: Int, text: String, onTap: () -> Unit): LinearLayout {
        val selectable = TypedValue()
        theme.resolveAttribute(android.R.attr.selectableItemBackgroundBorderless, selectable, true)
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            minimumHeight = dp(MIN_TOUCH_DP)
            isClickable = true
            isFocusable = true
            setBackgroundResource(selectable.resourceId)
            addView(
                FrameLayout(this@CallActivity).apply {
                    background = oval(color)
                    addView(
                        ImageView(this@CallActivity).apply {
                            setImageResource(icon)
                            setColorFilter(Color.WHITE)
                        },
                        FrameLayout.LayoutParams(dp(CONTROL_ICON_DP), dp(CONTROL_ICON_DP), Gravity.CENTER),
                    )
                },
                LinearLayout.LayoutParams(dp(CONTROL_DP), dp(CONTROL_DP)),
            )
            addView(
                label(text, currentPalette().text, LABEL_SP).apply { setPadding(0, dp(8), 0, 0) },
            )
            setOnClickListener { onTap() }
        }
    }

    private fun currentPalette(): CallPalette = CallPalette.of(isNight())

    private fun startTicker(startedAtMillis: Long, spanish: Boolean) {
        val runnable = object : Runnable {
            override fun run() {
                statusView?.text = PushText.ringStatus(spanish, PushText.clock(System.currentTimeMillis() - startedAtMillis))
                handler.postDelayed(this, TICK_MS)
            }
        }
        ticker = runnable
        runnable.run()
    }

    private fun label(text: String, color: Int, sp: Float): TextView =
        TextView(this).apply {
            this.text = text
            setTextColor(color)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
            gravity = Gravity.CENTER_HORIZONTAL
        }

    private fun oval(color: Int): GradientDrawable = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(color)
    }

    private fun isNight(): Boolean =
        (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    private fun dp(value: Int): Int = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

    private companion object {
        const val MAX_WIDTH_DP = 480
        const val MIN_TOUCH_DP = 48
        const val EMBLEM_DP = 160
        const val EMBLEM_ICON_DP = 96
        const val CONTROL_DP = 72
        const val CONTROL_ICON_DP = 32
        const val CONTROL_WIDTH_DP = 104
        const val PULSE_MS = 900L
        const val PULSE_SCALE = 1.06f
        const val TICK_MS = 1000L
        const val LABEL_SP = 14f
        const val STATUS_SP = 14f
        const val TITLE_SP = 26f
    }
}
