// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "RecorderCore", products: [.library(name: "RecorderCore", targets: ["RecorderCore"])], targets: [.target(name: "RecorderCore"), .executableTarget(name: "RecorderCoreChecks", dependencies: ["RecorderCore"], path: "Checks")])
