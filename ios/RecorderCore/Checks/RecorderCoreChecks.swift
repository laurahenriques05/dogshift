import Foundation
import RecorderCore

// Portable assertions keep the recorder checks runnable with Swift CLI tools;
// the iOS adapter still requires a full Xcode/device build.
func expectTrue(_ value: @autoclosure () throws -> Bool) { do { let result = try value(); precondition(result) } catch { fatalError("Unexpected error: \(error)") } }
func expectFalse(_ value: @autoclosure () throws -> Bool) { do { let result = try value(); precondition(!result) } catch { fatalError("Unexpected error: \(error)") } }
func expectEqual<T: Equatable>(_ value: @autoclosure () throws -> T, _ expected: T) { do { let result = try value(); precondition(result == expected) } catch { fatalError("Unexpected error: \(error)") } }
func expectNil<T>(_ value: T?) { precondition(value == nil) }
func expectThrows<T>(_ value: @autoclosure () throws -> T) { do { _ = try value() } catch { return }; fatalError("Expected rejection") }
func expectNoThrow<T>(_ value: @autoclosure () throws -> T) { do { _ = try value() } catch { fatalError("Unexpected rejection: \(error)") } }

struct RecorderCoreChecks {
    let t = 1_790_000_000_000.0
    func recording() -> Recording { Recording(user: "u", household: "h", walk: "w", startedAt: RecorderPolicy.iso(t), gps: true, nextSeq: 0) }
    func point(_ offset: Double, lat: Double = 38, accuracy: Double = 8) -> RoutePoint { RoutePoint(seq: 99, recorded_at: RecorderPolicy.iso(t+offset), latitude: lat, longitude: -9, accuracy: accuracy) }
    func testQueuesFixesWithoutAnyJavaScriptAndSurvivesSerialization() throws {
        var s = recording(); try RecorderPolicy.resume(&s, now: t)
        for i in 0..<30 { expectTrue(try RecorderPolicy.receive(&s, point: point(Double(i)*5_000), now: t+Double(i)*5_000)) }
        let loaded = try JSONDecoder().decode(Recording.self, from: JSONEncoder().encode(s))
        expectEqual(loaded.points.count, 30); expectEqual(loaded.nextSeq, 30)
        expectTrue(loaded.points[0].segment_start); expectFalse(loaded.points[1].segment_start)
    }
    func testRejectsBadAccuracyStaleFutureOutOfBoundsFastAndDuplicateFixes() throws {
        var s = recording(); try RecorderPolicy.resume(&s, now: t)
        expectFalse(try RecorderPolicy.receive(&s, point: point(0, accuracy: -1), now: t))
        expectFalse(try RecorderPolicy.receive(&s, point: point(0, accuracy: 51), now: t))
        expectFalse(try RecorderPolicy.receive(&s, point: point(0, lat: 91), now: t))
        expectFalse(try RecorderPolicy.receive(&s, point: point(0), now: t+31_000))
        expectFalse(try RecorderPolicy.receive(&s, point: point(5_000), now: t))
        expectTrue(try RecorderPolicy.receive(&s, point: point(0), now: t))
        expectFalse(try RecorderPolicy.receive(&s, point: point(0), now: t))
        expectFalse(try RecorderPolicy.receive(&s, point: point(5_000, lat: 39), now: t+5_000))
        expectEqual(s.nextSeq, 1)
    }
    func testPauseStopsPointsAndResumeClosesPauseWithNewSegment() throws {
        var s=recording(); try RecorderPolicy.resume(&s, now: t)
        _ = try RecorderPolicy.receive(&s, point: point(0), now: t)
        try RecorderPolicy.pause(&s, now: t+1_000)
        expectFalse(try RecorderPolicy.receive(&s, point: point(6_000), now: t+6_000))
        try RecorderPolicy.resume(&s, now: t+10_000)
        expectEqual(s.pauses[0].end, RecorderPolicy.iso(t+10_000))
        expectTrue(try RecorderPolicy.receive(&s, point: point(11_000, lat: 39), now: t+11_000))
        expectTrue(s.points[1].segment_start)
    }
    func testOfflineDoesNotResumeUntilExplicitCommandOrInventPoints() throws {
        var s=recording(); try RecorderPolicy.resume(&s, now: t)
        _ = try RecorderPolicy.receive(&s, point: point(0), now: t)
        RecorderPolicy.interrupt(&s)
        expectFalse(try RecorderPolicy.receive(&s, point: point(6_000), now: t+6_000))
        RecorderPolicy.tick(&s, now: t+120_000, visible: true)
        expectEqual(s.state,"connectionLost"); expectEqual(s.points.count,1)
        try RecorderPolicy.resume(&s, now:t+130_000)
        _ = try RecorderPolicy.receive(&s, point: point(131_000), now: t+131_000)
        expectEqual(s.points.map(\.seq),[0,1]); expectTrue(s.points[1].segment_start)
    }
    func testFinishedRecordingCannotResumeAndPendingFixesRemainUntilAck() throws {
        var s=recording();try RecorderPolicy.resume(&s,now:t)
        _ = try RecorderPolicy.receive(&s,point:point(0),now:t)
        _ = try RecorderPolicy.receive(&s,point:point(5_000),now:t+5_000)
        RecorderPolicy.finish(&s,now:t+6_000)
        expectThrows(try RecorderPolicy.resume(&s,now:t+7_000))
        expectEqual(s.points.count,2)
        RecorderPolicy.acknowledge(&s,through:0);expectEqual(s.points.map(\.seq),[1])
        let ended = s.ending?.at;RecorderPolicy.finish(&s,now:t+8_000);expectEqual(s.ending?.at,ended)
    }
    func testOwnerHouseholdAndWalkIsolation() throws {
        let s=recording()
        expectThrows(try RecorderPolicy.checkOwner(s,user:"other",household:"h"))
        expectThrows(try RecorderPolicy.checkOwner(s,user:"u",household:"other"))
        expectThrows(try RecorderPolicy.checkOwner(s,user:"u",household:"h",walk:"other"))
        expectNoThrow(try RecorderPolicy.checkOwner(s,user:"u",household:"h",walk:"w"))
    }
    func testOnlyFreshVisibleContinuousGpsWarnsThenUnansweredDeadlineEndsWhileHidden() throws {
        var s=recording();try RecorderPolicy.resume(&s,now:t)
        for i in 0...24 { _ = try RecorderPolicy.receive(&s,point:point(Double(i)*5_000),now:t+Double(i)*5_000) }
        RecorderPolicy.tick(&s,now:t+120_000,visible:true);expectEqual(s.warning,t+120_000)
        RecorderPolicy.tick(&s,now:t+419_999,visible:false);expectNil(s.ending)
        RecorderPolicy.tick(&s,now:t+420_000,visible:false);expectEqual(s.ending?.reason,"stationary")
    }
    func testHiddenGpsStillRecordsWithoutNewStationaryQuestion() throws {
        var s=recording();try RecorderPolicy.resume(&s,now:t)
        for i in 0...40 { let time=t+Double(i)*5_000; _ = try RecorderPolicy.receive(&s,point:point(Double(i)*5_000),now:time); RecorderPolicy.tick(&s,now:time,visible:false) }
        expectEqual(s.points.count,41);expectNil(s.warning);expectNil(s.ending)
    }
    func testGapIsNotStationarityAndKeepWalkingClearsDeadline() throws {
        var s=recording();try RecorderPolicy.resume(&s,now:t)
        _ = try RecorderPolicy.receive(&s,point:point(0),now:t)
        _ = try RecorderPolicy.receive(&s,point:point(125_000),now:t+125_000)
        RecorderPolicy.tick(&s,now:t+125_000,visible:true);expectNil(s.warning)
        s.warning=t;RecorderPolicy.clearStationary(&s);RecorderPolicy.tick(&s,now:t+500_000,visible:true);expectNil(s.ending)
    }
}

@main struct RunRecorderChecks {
 static func main() throws {
  let checks = RecorderCoreChecks()
  try checks.testQueuesFixesWithoutAnyJavaScriptAndSurvivesSerialization()
  try checks.testRejectsBadAccuracyStaleFutureOutOfBoundsFastAndDuplicateFixes()
  try checks.testPauseStopsPointsAndResumeClosesPauseWithNewSegment()
  try checks.testOfflineDoesNotResumeUntilExplicitCommandOrInventPoints()
  try checks.testFinishedRecordingCannotResumeAndPendingFixesRemainUntilAck()
  try checks.testOwnerHouseholdAndWalkIsolation()
  try checks.testOnlyFreshVisibleContinuousGpsWarnsThenUnansweredDeadlineEndsWhileHidden()
  try checks.testHiddenGpsStillRecordsWithoutNewStationaryQuestion()
  try checks.testGapIsNotStationarityAndKeepWalkingClearsDeadline()
  print("9 recorder core checks passed")
 }
}
