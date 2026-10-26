package com.davidacme.argus.push

internal data class CallStageScale(
    val avatarDp: Int,
    val controlDp: Int,
    val topDp: Int,
    val avatarGapDp: Int,
    val titleSp: Float,
)

internal fun callStageScaleOf(heightDp: Int): CallStageScale =
    when {
        heightDp >= 740 -> CallStageScale(avatarDp = 168, controlDp = 64, topDp = 48, avatarGapDp = 32, titleSp = 30f)
        heightDp >= 640 -> CallStageScale(avatarDp = 136, controlDp = 64, topDp = 32, avatarGapDp = 24, titleSp = 28f)
        heightDp >= 560 -> CallStageScale(avatarDp = 104, controlDp = 56, topDp = 24, avatarGapDp = 16, titleSp = 26f)
        else -> CallStageScale(avatarDp = 64, controlDp = 52, topDp = 12, avatarGapDp = 8, titleSp = 22f)
    }
