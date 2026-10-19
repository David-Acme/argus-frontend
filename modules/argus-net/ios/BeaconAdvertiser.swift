import CoreBluetooth
import Foundation

final class BeaconAdvertiser: NSObject, CBPeripheralManagerDelegate {
  private var manager: CBPeripheralManager?
  private var seed: Data?
  private var rotateSeconds: Int64 = 900
  private var timer: Timer?
  private(set) var running = false

  static var authorized: Bool {
    CBManager.authorization == .allowedAlways
  }

  static var refused: Bool {
    CBManager.authorization == .denied || CBManager.authorization == .restricted
  }

  func start(seed: Data, rotateSeconds: Int64) {
    DispatchQueue.main.async {
      self.seed = seed
      self.rotateSeconds = max(rotateSeconds, 60)
      self.running = true
      if let manager = self.manager {
        self.advertise(manager)
      } else {
        self.manager = CBPeripheralManager(delegate: self, queue: .main)
      }
    }
  }

  func stop() {
    DispatchQueue.main.async {
      self.running = false
      self.timer?.invalidate()
      self.timer = nil
      self.manager?.stopAdvertising()
      self.seed = nil
    }
  }

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    guard peripheral.state == .poweredOn else {
      peripheral.stopAdvertising()
      return
    }
    advertise(peripheral)
  }

  private func advertise(_ peripheral: CBPeripheralManager) {
    guard running, let seed, peripheral.state == .poweredOn else { return }
    peripheral.stopAdvertising()
    let now = Date().timeIntervalSince1970
    let counter = BeaconToken.counter(nowSeconds: Int64(now), rotateSeconds: rotateSeconds)
    let token = BeaconToken.uuid(seed: seed, counter: counter)
    peripheral.startAdvertising([CBAdvertisementDataServiceUUIDsKey: [CBUUID(nsuuid: token)]])
    timer?.invalidate()
    timer = Timer.scheduledTimer(
      withTimeInterval: BeaconToken.secondsToNextRotation(now: now, rotateSeconds: rotateSeconds),
      repeats: false
    ) { [weak self] _ in
      guard let self, let manager = self.manager else { return }
      self.advertise(manager)
    }
  }
}
