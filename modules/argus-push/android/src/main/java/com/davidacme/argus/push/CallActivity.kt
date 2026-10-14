package com.davidacme.argus.push

import android.app.Activity
import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class CallActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val callId = intent.getStringExtra(PushActions.EXTRA_CALL_ID)
        if (callId.isNullOrEmpty()) {
            finish()
            return
        }
        if (intent.action == PushActions.ACTION_ANSWER) {
            CallSession.answer(this, callId)
            finish()
            return
        }
        setContentView(callLayout(callId))
    }

    private fun callLayout(callId: String): LinearLayout {
        val spanish = PushText.isSpanish()
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(PADDING, PADDING, PADDING, PADDING)
            addView(
                TextView(this@CallActivity).apply {
                    text = PushText.TITLE
                    textSize = TITLE_SP
                    gravity = Gravity.CENTER
                },
            )
            addView(
                TextView(this@CallActivity).apply {
                    text = PushText.callTitle(spanish)
                    textSize = SUBTITLE_SP
                    gravity = Gravity.CENTER
                },
            )
            addView(
                Button(this@CallActivity).apply {
                    text = PushText.answer(spanish)
                    setOnClickListener {
                        CallSession.answer(this@CallActivity, callId)
                        finish()
                    }
                },
            )
            addView(
                Button(this@CallActivity).apply {
                    text = PushText.decline(spanish)
                    setOnClickListener {
                        CallSession.decline(this@CallActivity, callId)
                        finish()
                    }
                },
            )
        }
    }

    private companion object {
        const val PADDING = 48
        const val TITLE_SP = 28f
        const val SUBTITLE_SP = 18f
    }
}
