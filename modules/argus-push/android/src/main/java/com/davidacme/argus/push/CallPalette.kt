package com.davidacme.argus.push

internal data class CallPalette(
    val background: Int,
    val text: Int,
    val secondary: Int,
    val emblem: Int,
    val accept: Int,
    val decline: Int,
) {
    companion object {
        fun of(night: Boolean): CallPalette =
            if (night) {
                CallPalette(
                    background = 0xFF181816.toInt(),
                    text = 0xFFF4EFE7.toInt(),
                    secondary = 0xFFD4CBBF.toInt(),
                    emblem = 0xFF24231E.toInt(),
                    accept = 0xFF63AE73.toInt(),
                    decline = 0xFFB94A44.toInt(),
                )
            } else {
                CallPalette(
                    background = 0xFFF4F1ED.toInt(),
                    text = 0xFF161616.toInt(),
                    secondary = 0xFF57524E.toInt(),
                    emblem = 0xFFFFFFFF.toInt(),
                    accept = 0xFF3B7B4F.toInt(),
                    decline = 0xFFCC3535.toInt(),
                )
            }
    }
}
