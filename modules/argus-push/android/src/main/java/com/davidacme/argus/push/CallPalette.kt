package com.davidacme.argus.push

internal data class CallPalette(
    val background: Int,
    val surface: Int,
    val fill: Int,
    val text: Int,
    val secondary: Int,
    val alertGlow: Int,
    val accept: Int,
    val decline: Int,
) {
    companion object {
        val STAGE = CallPalette(
            background = 0xFF181816.toInt(),
            surface = 0xFF24231E.toInt(),
            fill = 0xFF312E27.toInt(),
            text = 0xFFF4EFE7.toInt(),
            secondary = 0xFFD4CBBF.toInt(),
            alertGlow = 0xFF6A231E.toInt(),
            accept = 0xFF25A85A.toInt(),
            decline = 0xFFD83A34.toInt(),
        )
    }
}
