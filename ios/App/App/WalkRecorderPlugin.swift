import Capacitor
import CoreLocation
import Network
import UIKit

// One process-wide recorder; WKWebView suspension never owns the GPS lifetime.
final class NativeWalkRecorder: NSObject, CLLocationManagerDelegate {
    static let shared = NativeWalkRecorder()
    private let location = CLLocationManager()
    private let network = NWPathMonitor()
    private let file: URL
    private var timer: Timer?
    private var permissionCall: ((Result<Void, Error>) -> Void)?
    private(set) var session: Recording?
    private(set) var failure: String?
    var changed: (() -> Void)?
    private var now: Double { Date().timeIntervalSince1970 * 1000 }

    private override init() {
        let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("WalkRecorder", isDirectory: true)
        file = folder.appendingPathComponent("recording.json")
        super.init()
        do {
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
            var excluded = folder; var values = URLResourceValues(); values.isExcludedFromBackup = true; try excluded.setResourceValues(values)
            if FileManager.default.fileExists(atPath: file.path) {
                session = try JSONDecoder().decode(Recording.self, from: Data(contentsOf: file))
                // Process termination is a gap, not permission to start silently.
                if session?.state == "recording" { try mutate { RecorderPolicy.interrupt(&$0, state: "interrupted") } }
            }
        } catch { failure = "Could not open the private GPS queue. Do not reinstall; retry after unlocking your device." }
        location.delegate = self
        location.desiredAccuracy = kCLLocationAccuracyBest
        location.distanceFilter = kCLDistanceFilterNone
        location.activityType = .fitness
        location.pausesLocationUpdatesAutomatically = false
        location.allowsBackgroundLocationUpdates = true
        location.showsBackgroundLocationIndicator = true
        network.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                guard let self, path.status != .satisfied, self.session?.state == "recording", self.session?.gps == true else { return }
                self.location.stopUpdatingLocation()
                self.perform { try self.mutate { RecorderPolicy.interrupt(&$0) } }
            }
        }
        network.start(queue: DispatchQueue(label: "pt.dogshift.walk-network"))
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self, self.session?.state == "recording" else { return }
            let before = self.session?.warning
            var candidate = self.session!
            RecorderPolicy.tick(&candidate, now: self.now, visible: UIApplication.shared.applicationState == .active)
            if candidate.ending != nil || before != candidate.warning {
                self.perform { try self.save(candidate) }
                if candidate.ending != nil { self.location.stopUpdatingLocation() }
            } else { self.session = candidate }
        }
    }
    func perform(_ action: () throws -> Void) {
        do { try action() }
        catch { location.stopUpdatingLocation(); failure = "GPS stopped because its private queue could not be saved. Keep the app installed and retry."; session?.state = "interrupted"; session?.error = failure!; changed?() }
    }
    func save(_ value: Recording) throws {
        let data = try JSONEncoder().encode(value)
        try data.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        session = value; failure = nil; changed?()
    }
    func mutate(_ body: (inout Recording) throws -> Void) throws {
        guard var value = session else { throw RecorderFailure.invalidState }
        try body(&value); try save(value)
    }
    func owned(_ call: CAPPluginCall) throws -> Recording? {
        guard failure == nil || session != nil else { throw RecorderFailure.invalidState }
        if let session { try RecorderPolicy.checkOwner(session, user: call.getString("user") ?? "", household: call.getString("household") ?? "", walk: call.getString("walk")) }
        return session
    }
    func prepare(_ value: Recording) throws {
        if let current = session { try RecorderPolicy.checkOwner(current, user: value.user, household: value.household, walk: value.walk); return }
        guard failure == nil else { throw RecorderFailure.invalidState }
        try save(value)
    }
    func permission(_ done: @escaping (Result<Void, Error>) -> Void) {
        switch location.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse: done(.success(()))
        case .notDetermined:
            guard permissionCall == nil else { done(.failure(RecorderFailure.invalidState)); return }
            permissionCall = done; location.requestWhenInUseAuthorization()
        default: done(.failure(RecorderFailure.invalidState))
        }
    }
    func start() throws {
        guard session != nil, failure == nil else { throw RecorderFailure.invalidState }
        if session!.gps, network.currentPath.status != .satisfied { throw RecorderFailure.invalidState }
        try mutate { try RecorderPolicy.resume(&$0, now: now) }
        if session!.gps { location.startUpdatingLocation() }
    }
    func pause() throws { location.stopUpdatingLocation(); try mutate { try RecorderPolicy.pause(&$0, now: now) } }
    func interrupt(_ state: String) throws { location.stopUpdatingLocation(); try mutate { RecorderPolicy.interrupt(&$0, state: state) } }
    func finish() throws { location.stopUpdatingLocation(); try mutate { RecorderPolicy.finish(&$0, now: now) } }
    func clear() throws {
        guard let session, session.ending != nil, session.points.isEmpty else { throw RecorderFailure.invalidState }
        location.stopUpdatingLocation()
        try FileManager.default.removeItem(at: file); self.session = nil; changed?()
    }
    func suspend() { permissionCall?(.failure(RecorderFailure.invalidState)); permissionCall = nil; location.stopUpdatingLocation(); if session != nil { perform { try interrupt("interrupted") } } }
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus != .notDetermined, let done = permissionCall {
            permissionCall = nil
            if manager.authorizationStatus == .authorizedAlways || manager.authorizationStatus == .authorizedWhenInUse { done(.success(())) }
            else { done(.failure(RecorderFailure.invalidState)) }
        }
        if manager.authorizationStatus == .denied || manager.authorizationStatus == .restricted {
            location.stopUpdatingLocation()
            if session != nil { perform { try mutate { RecorderPolicy.interrupt(&$0, state: "denied"); $0.error = "Location denied. Allow location in iOS Settings, then Resume GPS." } } }
        }
    }
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        for fix in locations.sorted(by: { $0.timestamp < $1.timestamp }) {
            guard session?.state == "recording", failure == nil else { return }
            let point = RoutePoint(seq: 0, recorded_at: RecorderPolicy.iso(fix.timestamp.timeIntervalSince1970 * 1000), latitude: fix.coordinate.latitude, longitude: fix.coordinate.longitude, accuracy: fix.horizontalAccuracy)
            do {
                var value = session!
                if try RecorderPolicy.receive(&value, point: point, now: now) { try save(value) }
            } catch { location.stopUpdatingLocation(); failure = "GPS stopped: the private queue is full or unavailable. Return to Walks to save it."; session?.state = "interrupted"; session?.error = failure!; changed?(); return }
        }
    }
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // A temporary no-fix error is not evidence of stationarity.
        if (error as? CLError)?.code == .denied { locationManagerDidChangeAuthorization(manager) }
        else if session != nil { perform { try mutate { if $0.warning == nil { RecorderPolicy.clearStationary(&$0) }; $0.error = "GPS unavailable. Waiting for an accurate position." } } }
    }
    func snapshot() throws -> JSObject {
        var result: JSObject = ["session": NSNull()]
        if let session {
            result["session"] = try JSValueEncoder().encode(session)
        }
        if let failure, session == nil { result["error"] = failure }
        return result
    }
}

@objc(WalkRecorderPlugin)
public class WalkRecorderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WalkRecorderPlugin"
    public let jsName = "WalkRecorder"
    public let pluginMethods: [CAPPluginMethod] = ["prepare", "start", "snapshot", "pause", "interrupt", "finish", "acknowledge", "clear", "keepWalking", "setAutoEnd", "suspend"].map { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }
    public override func load() {
        DispatchQueue.main.async { NativeWalkRecorder.shared.changed = { [weak self] in self?.notifyListeners("changed", data: [:]) } }
    }
    private func run(_ call: CAPPluginCall, _ work: @escaping (NativeWalkRecorder) throws -> Void) {
        DispatchQueue.main.async {
            let recorder = NativeWalkRecorder.shared
            do { _ = try recorder.owned(call); try work(recorder); call.resolve(try recorder.snapshot()) }
            catch { call.reject(recorder.failure ?? "This recording cannot be accessed or changed. Use its original account and finish saving that walk first.") }
        }
    }
    @objc func prepare(_ call: CAPPluginCall) {
        run(call) { recorder in
            guard let user = call.getString("user"), UUID(uuidString: user) != nil,
                  let household = call.getString("household"), UUID(uuidString: household) != nil,
                  let walk = call.getString("walk"), UUID(uuidString: walk) != nil,
                  let startedAt = call.getString("startedAt"), RecorderPolicy.ms(startedAt).isFinite,
                  let nextSeq = call.getInt("nextSeq"), nextSeq >= 0 else { throw RecorderFailure.invalidState }
            let data = call.getObject("lastPoint").flatMap { try? JSONSerialization.data(withJSONObject: $0) }
            let tail = data.flatMap { try? JSONDecoder().decode(RoutePoint.self, from: $0) }
            try recorder.prepare(Recording(user: user, household: household, walk: walk, startedAt: startedAt, gps: call.getBool("gps") ?? true, nextSeq: nextSeq, lastPoint: tail))
        }
    }
    @objc func snapshot(_ call: CAPPluginCall) { run(call) { _ in } }
    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let recorder = NativeWalkRecorder.shared
            do {
                guard let session = try recorder.owned(call) else { throw RecorderFailure.invalidState }
                let start = { (result: Result<Void, Error>) in
                    do { try result.get(); _ = try recorder.owned(call); try recorder.start(); call.resolve(try recorder.snapshot()) }
                    catch { call.reject("Location could not start. Check iOS location permission and your connection, then retry.") }
                }
                if session.gps { recorder.permission(start) } else { start(.success(())) }
            } catch { call.reject("Open the original active walk before starting GPS.") }
        }
    }
    @objc func pause(_ call: CAPPluginCall) { run(call) { try $0.pause() } }
    @objc func interrupt(_ call: CAPPluginCall) { run(call) { try $0.interrupt("connectionLost") } }
    @objc func finish(_ call: CAPPluginCall) { run(call) { try $0.finish() } }
    @objc func acknowledge(_ call: CAPPluginCall) {
        run(call) { recorder in
            guard let seq = call.getInt("through"), seq >= 0, let session = recorder.session, seq < session.nextSeq else { throw RecorderFailure.invalidState }
            try recorder.mutate { RecorderPolicy.acknowledge(&$0, through: seq) }
        }
    }
    @objc func clear(_ call: CAPPluginCall) { run(call) { try $0.clear() } }
    @objc func keepWalking(_ call: CAPPluginCall) { run(call) { try $0.mutate { RecorderPolicy.clearStationary(&$0) } } }
    @objc func setAutoEnd(_ call: CAPPluginCall) { run(call) { recorder in try recorder.mutate { $0.autoEnd = call.getBool("enabled") ?? true; RecorderPolicy.clearStationary(&$0) } } }
    // Only called when the authenticated React provider leaves (sign-out/family change).
    @objc func suspend(_ call: CAPPluginCall) { run(call) { $0.suspend() } }
}
