package com.margelo.nitro.net

import java.io.File
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class BeaconTokenTest {
  private val vectors = JSONObject(File(requireNotNull(System.getProperty("argus.beaconVectors"))).readText())

  @Test
  fun everyVectorGivesTheSameServiceUuidAsTheServer() {
    val cases = vectors.getJSONArray("cases")
    for (index in 0 until cases.length()) {
      val case = cases.getJSONObject(index)
      val seed = requireNotNull(BeaconToken.seedBytes(case.getString("seed")))
      val counter = BeaconToken.counter(case.getLong("nowSeconds"), case.getLong("rotateSeconds"))
      assertEquals(case.getLong("counter"), counter)
      assertEquals(case.getString("uuid"), BeaconToken.uuid(seed, counter).toString())
    }
  }

  @Test
  fun aShortOrBrokenSeedIsRefused() {
    assertNull(BeaconToken.seedBytes("AAEC"))
    assertNull(BeaconToken.seedBytes("not base64 !"))
  }

  @Test
  fun theNextRotationLandsOnThePeriodBoundary() {
    assertEquals(900_000L, BeaconToken.millisToNextRotation(1_791_000_000_000L, 900L))
    assertEquals(1L, BeaconToken.millisToNextRotation(1_791_000_899_999L, 900L))
  }
}
