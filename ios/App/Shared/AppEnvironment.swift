import UIKit

/// 两个 target（在线版 / 离线版）共用这一份入口代码，差异全部来自 Info.plist：
///   FireflyWebMode   = online | offline
///   FireflyOnlineURL = 在线版加载的地址
enum AppEnvironment {
	enum Mode: String {
		case offline
		case online
	}

	static var mode: Mode {
		let raw = infoString("FireflyWebMode") ?? "online"
		return Mode(rawValue: raw.lowercased()) ?? .online
	}

	static var onlineURL: URL {
		let raw = infoString("FireflyOnlineURL") ?? "https://lkerylm.github.io/"
		return URL(string: raw) ?? URL(string: "https://lkerylm.github.io/")!
	}

	/// App 包里的离线站点根目录（Xcode 里是以「文件夹引用」塞进去的 OfflineWeb/）
	static var bundledWebRoot: URL? {
		Bundle.main.url(forResource: "OfflineWeb", withExtension: nil)
	}

	static var version: String {
		infoString("CFBundleShortVersionString") ?? "0.0.0"
	}

	static var build: String {
		infoString("CFBundleVersion") ?? "0"
	}

	/// 追加到 WKWebView 默认 UA 末尾，前端用它判断「已经在 App 里了」
	/// （见 src/components/features/PwaManager.astro 的 isFireflyShell）
	static var userAgentSuffix: String {
		"FireflyApp/\(version)"
	}

	/// 与站点主题色一致，避免启动 / 加载时闪白
	static var themeColor: UIColor {
		UIColor(red: 1.0, green: 0.914, blue: 0.957, alpha: 1.0)
	}

	private static func infoString(_ key: String) -> String? {
		(Bundle.main.object(forInfoDictionaryKey: key) as? String)?
			.trimmingCharacters(in: .whitespacesAndNewlines)
	}
}
