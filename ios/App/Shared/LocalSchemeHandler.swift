import Foundation
import UniformTypeIdentifiers
import WebKit

/// 离线版专用：把 `app://localhost/<path>` 映射到 App 包里的 `OfflineWeb/` 目录。
///
/// 为什么不用 `loadFileURL`：站点里的链接和资源全是 `/favicon/anime.svg`、`/ios/`
/// 这种根路径写法，`file://` 下根会跑到文件系统根目录，全部 404。
/// 换成自定义协议后 `/` 就是离线包根目录，站内跳转、fetch、pagefind 搜索都照常能用。
final class LocalSchemeHandler: NSObject, WKURLSchemeHandler {
	static let scheme = "app"
	static let host = "localhost"

	private let root: URL
	private let lock = NSLock()
	private var runningTasks: Set<ObjectIdentifier> = []

	init(root: URL) {
		self.root = root
		super.init()
	}

	// MARK: - WKURLSchemeHandler

	func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
		let token = ObjectIdentifier(urlSchemeTask)
		lock.lock()
		runningTasks.insert(token)
		lock.unlock()

		defer {
			lock.lock()
			runningTasks.remove(token)
			lock.unlock()
		}

		guard let url = urlSchemeTask.request.url else { return }

		let path = url.path.removingPercentEncoding ?? url.path

		guard let fileURL = resolve(path) else {
			respondNotFound(urlSchemeTask, url: url, path: path)
			return
		}

		guard let data = try? Data(contentsOf: fileURL, options: .mappedIfSafe) else {
			respondNotFound(urlSchemeTask, url: url, path: path)
			return
		}

		respond(
			urlSchemeTask,
			url: url,
			status: 200,
			body: data,
			contentType: mimeType(for: fileURL)
		)
	}

	func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
		lock.lock()
		runningTasks.remove(ObjectIdentifier(urlSchemeTask))
		lock.unlock()
	}

	// MARK: - 内部实现

	private func isRunning(_ task: WKURLSchemeTask) -> Bool {
		lock.lock()
		defer { lock.unlock() }
		return runningTasks.contains(ObjectIdentifier(task))
	}

	private func respond(
		_ task: WKURLSchemeTask,
		url: URL,
		status: Int,
		body: Data,
		contentType: String = "application/octet-stream"
	) {
		// WebKit 要求：已经 stop 掉的 task 再回调会直接崩，所以每次都确认一遍
		guard isRunning(task) else { return }

		let headers = [
			"Content-Type": contentType,
			"Content-Length": String(body.count),
			"Access-Control-Allow-Origin": "*",
			"Cache-Control": "no-cache"
		]
		guard
			let response = HTTPURLResponse(
				url: url,
				statusCode: status,
				httpVersion: "HTTP/1.1",
				headerFields: headers
			)
		else { return }

		task.didReceive(response)
		task.didReceive(body)
		task.didFinish()
	}

	private func respondNotFound(_ task: WKURLSchemeTask, url: URL, path: String) {
		let html = """
		<!doctype html>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width,initial-scale=1">
		<title>页面没打进离线包</title>
		<body style="margin:0;padding:56px 24px;background:#fff7fb;color:#5c3d4d;\
		font:15px/1.8 -apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;text-align:center">
		<p style="font-size:34px;margin:0 0 12px">🌸</p>
		<h1 style="font-size:18px;margin:0 0 8px">这个页面没被打进离线包</h1>
		<p style="opacity:.65;word-break:break-all;margin:0">\(path)</p>
		<p style="opacity:.55;margin:18px 0 0">回首页看看：<span style="color:#ff6fa8">app://localhost/</span></p>
		</body>
		"""
		respond(
			task,
			url: url,
			status: 404,
			body: Data(html.utf8),
			contentType: "text/html; charset=utf-8"
		)
	}

	/// 把请求路径落到磁盘文件：支持 `/`、`/about/`、`/about`、`/about.html` 四种写法
	private func resolve(_ path: String) -> URL? {
		var relative = path.hasPrefix("/") ? String(path.dropFirst()) : path
		guard !relative.contains("..") else { return nil }
		if relative.isEmpty || relative.hasSuffix("/") {
			relative += "index.html"
		}

		let direct = root.appendingPathComponent(relative)
		if isFile(direct) { return direct }

		if (relative as NSString).pathExtension.isEmpty {
			let nested = root.appendingPathComponent(relative).appendingPathComponent("index.html")
			if isFile(nested) { return nested }

			let html = root.appendingPathComponent("\(relative).html")
			if isFile(html) { return html }
		}

		return nil
	}

	private func isFile(_ url: URL) -> Bool {
		var isDirectory: ObjCBool = false
		let exists = FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory)
		return exists && !isDirectory.boolValue
	}

	private func mimeType(for url: URL) -> String {
		guard let type = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType else {
			return "application/octet-stream"
		}
		let needsCharset =
			type.hasPrefix("text/") || type == "application/json" || type == "image/svg+xml"
		return needsCharset ? "\(type); charset=utf-8" : type
	}
}
