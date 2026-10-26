package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CallStageScaleTest {
    @Test
    fun aTallPhoneKeepsThePrototypeStage() {
        assertEquals(CallStageScale(avatarDp = 168, controlDp = 64, topDp = 48, avatarGapDp = 32, titleSp = 30f), callStageScaleOf(760))
    }

    @Test
    fun shortPhonesShrinkTheAvatarFirstAndKeepTouchSizedButtons() {
        assertEquals(136, callStageScaleOf(640).avatarDp)
        assertEquals(104, callStageScaleOf(568).avatarDp)
        listOf(568, 360, 320).forEach { assertTrue(callStageScaleOf(it).controlDp >= 48) }
    }

    @Test
    fun theStageNeverGrowsAsTheScreenGetsShorter() {
        val avatars = listOf(900, 740, 667, 640, 568, 360).map { callStageScaleOf(it).avatarDp }
        assertEquals(avatars.sortedDescending(), avatars)
    }
}
