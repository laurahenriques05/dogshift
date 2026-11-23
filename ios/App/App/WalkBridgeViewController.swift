import Capacitor

class WalkBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WalkRecorderPlugin())
    }
}
