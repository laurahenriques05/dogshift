import Foundation

// No Auth tokens, network requests or UI dependencies. The iOS adapter serializes
// all mutations on the main queue and atomically persists before exposing a fix.
public struct RoutePoint: Codable, Equatable {
    public var seq: Int
    public var recorded_at: String
    public var latitude: Double
    public var longitude: Double
    public var accuracy: Double
    public var segment_start: Bool
    public init(seq: Int, recorded_at: String, latitude: Double, longitude: Double, accuracy: Double, segment_start: Bool = false) {
        self.seq = seq; self.recorded_at = recorded_at; self.latitude = latitude; self.longitude = longitude; self.accuracy = accuracy; self.segment_start = segment_start
    }
}
public struct Pause: Codable, Equatable { public var start: String; public var end: String? }
public struct EndIntent: Codable { public var at: String; public var reason: String }
public struct Recording: Codable {
    public var user: String
    public var household: String
    public var walk: String
    public var startedAt: String
    public var gps: Bool
    public var state = "ready"
    public var points: [RoutePoint] = []
    public var lastPoint: RoutePoint?
    public var nextSeq: Int
    public var newSegment = true
    public var pauses: [Pause] = []
    public var ending: EndIntent?
    public var autoEnd = true
    public var warning: Double?
    public var anchor: RoutePoint?
    public var stationarySince: Double?
    public var error = ""
    public init(user: String, household: String, walk: String, startedAt: String, gps: Bool, nextSeq: Int, lastPoint: RoutePoint? = nil) {
        self.user = user; self.household = household; self.walk = walk; self.startedAt = startedAt; self.gps = gps; self.nextSeq = nextSeq; self.lastPoint = lastPoint
    }
}
public enum RecorderFailure: Error { case wrongOwner, pendingWalk, invalidState, fullQueue }
public enum RecorderPolicy {
    public static func iso(_ ms: Double) -> String {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.string(from: Date(timeIntervalSince1970: ms / 1000))
    }
    public static func ms(_ iso: String) -> Double {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = f.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
        return date.map { $0.timeIntervalSince1970 * 1000 } ?? .nan
    }
    public static func distance(_ a: RoutePoint, _ b: RoutePoint) -> Double {
        let rad = Double.pi / 180
        let h = pow(sin((b.latitude-a.latitude)*rad/2),2) + cos(a.latitude*rad)*cos(b.latitude*rad)*pow(sin((b.longitude-a.longitude)*rad/2),2)
        return 12_742_000 * asin(sqrt(min(1,h)))
    }
    public static func accept(_ p: RoutePoint, previous: RoutePoint?, startedAt: String, now: Double) -> Bool {
        let at = ms(p.recorded_at)
        guard p.latitude.isFinite, p.longitude.isFinite, p.accuracy.isFinite, at.isFinite,
              abs(p.latitude) <= 90, abs(p.longitude) <= 180, p.accuracy >= 0, p.accuracy <= 50,
              at >= ms(startedAt), at <= now + 1_000, now-at <= 30_000 else { return false }
        guard let previous else { return true }
        let dt = at-ms(previous.recorded_at)
        return dt >= 5_000 && (p.segment_start || dt > 60_000 || distance(previous,p)/(dt/1000) <= 5)
    }
    public static func checkOwner(_ s: Recording, user: String, household: String, walk: String? = nil) throws {
        guard s.user == user, s.household == household else { throw RecorderFailure.wrongOwner }
        if let walk, walk != s.walk { throw RecorderFailure.pendingWalk }
    }
    public static func resume(_ s: inout Recording, now: Double) throws {
        guard s.ending == nil else { throw RecorderFailure.invalidState }
        if s.state == "recording" { return }
        if let i = s.pauses.indices.last, s.pauses[i].end == nil { s.pauses[i].end = iso(now) }
        s.state = "recording"; s.newSegment = true; s.error = ""; clearStationary(&s)
    }
    public static func pause(_ s: inout Recording, now: Double) throws {
        guard s.state == "recording", s.ending == nil else { throw RecorderFailure.invalidState }
        s.pauses.append(Pause(start: iso(now), end: nil)); s.state = "paused"; clearStationary(&s)
    }
    public static func interrupt(_ s: inout Recording, state: String = "connectionLost") {
        guard s.state == "recording", s.gps else { return }
        s.state = state; s.newSegment = true; clearStationary(&s)
    }
    public static func finish(_ s: inout Recording, now: Double, reason: String = "manual") {
        if s.ending != nil { return }
        let at = max(now, max(ms(s.startedAt), s.lastPoint.map { ms($0.recorded_at) } ?? now))
        if let i = s.pauses.indices.last, s.pauses[i].end == nil { s.pauses[i].end = iso(at) }
        s.ending = EndIntent(at: iso(at), reason: reason); s.state = "ending"; clearStationary(&s)
    }
    public static func clearStationary(_ s: inout Recording) { s.warning = nil; s.anchor = nil; s.stationarySince = nil }
    @discardableResult public static func receive(_ s: inout Recording, point: RoutePoint, now: Double) throws -> Bool {
        guard s.state == "recording", s.gps, s.ending == nil else { return false }
        var p = point; p.seq = s.nextSeq; p.segment_start = s.newSegment
        guard accept(p, previous: s.lastPoint, startedAt: s.startedAt, now: now) else { return false }
        guard s.points.count < 20_000 else { throw RecorderFailure.fullQueue }
        let previous = s.lastPoint
        s.points.append(p); s.lastPoint = p; s.nextSeq += 1; s.newSegment = false; s.error = ""
        if s.warning == nil {
            if p.accuracy > 25 { clearStationary(&s) }
            else if let anchor = s.anchor, let previous, ms(p.recorded_at)-ms(previous.recorded_at) <= 60_000, distance(anchor,p) <= 30 {
                // Existing continuous stationary window remains valid.
            } else { s.anchor = p; s.stationarySince = ms(p.recorded_at) }
        }
        return true
    }
    public static func tick(_ s: inout Recording, now: Double, visible: Bool) {
        guard s.autoEnd, s.state == "recording", s.gps else { clearStationary(&s); return }
        if let warning = s.warning {
            if now-warning >= 300_000 { finish(&s, now: now, reason: "stationary") }
            return
        }
        // Preserve existing product policy: only ask a new question while visible.
        guard visible, let last = s.lastPoint, now-ms(last.recorded_at) <= 15_000 else {
            s.anchor = nil; s.stationarySince = nil; return
        }
        if let since = s.stationarySince, now-since >= 120_000 { s.warning = now }
    }
    public static func acknowledge(_ s: inout Recording, through: Int) {
        s.points.removeAll { $0.seq <= through }
    }
}
