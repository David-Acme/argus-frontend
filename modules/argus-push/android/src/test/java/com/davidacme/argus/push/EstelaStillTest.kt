package com.davidacme.argus.push

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EstelaStillTest {
    @Test
    fun theStillIsDeterministicAndStaysInsideItsSquare() {
        val first = EstelaStill.strokes(134, EstelaMood.Idle)
        assertEquals(first, EstelaStill.strokes(134, EstelaMood.Idle))
        assertTrue(first.isNotEmpty())
        first.forEach { stroke ->
            listOf(stroke.x0, stroke.y0, stroke.x1, stroke.y1).forEach { assertTrue(it in 0f..134f) }
        }
    }

    @Test
    fun theStillIsTheIdleHookThatTurnsOneWayNeverAFigureEight() {
        val strokes = EstelaStill.strokes(200, EstelaMood.Idle)
        val turns = strokes.map { stroke ->
            val x = stroke.x1 - 100f
            val y = stroke.y1 - 100f
            val dx = stroke.x1 - stroke.x0
            val dy = stroke.y1 - stroke.y0
            x * dy - y * dx
        }
        val sameWay = turns.count { it > 0f }
        assertTrue(sameWay > strokes.size * 0.9 || sameWay < strokes.size * 0.1)
    }

    @Test
    fun anAlertStillLeansRed() {
        val idle = EstelaStill.strokes(100, EstelaMood.Idle)
        val alert = EstelaStill.strokes(100, EstelaMood.Alert)
        assertNotEquals(idle.map { it.color }, alert.map { it.color })
        val red = { color: Int -> (color shr 16) and 0xFF }
        val blue = { color: Int -> color and 0xFF }
        assertTrue(alert.sumOf { red(it.color) - blue(it.color) } > idle.sumOf { red(it.color) - blue(it.color) })
    }
}
