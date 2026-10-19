import Foundation
import NitroModules

public class HybridArgusBeacon: HybridArgusBeaconSpec {
  private let advertiser = BeaconAdvertiser()

  public func supported() throws -> Bool {
    return !BeaconAdvertiser.refused
  }

  public func permissionGranted() throws -> Bool {
    return BeaconAdvertiser.authorized
  }

  public func start(config: BeaconConfig) throws -> Promise<Bool> {
    guard let seed = BeaconToken.seedBytes(config.seed), !BeaconAdvertiser.refused else {
      return Promise.async { false }
    }
    advertiser.start(seed: seed, rotateSeconds: Int64(config.rotateSeconds))
    return Promise.async { true }
  }

  public func stop() throws {
    advertiser.stop()
  }

  public func running() throws -> Bool {
    return advertiser.running
  }
}
