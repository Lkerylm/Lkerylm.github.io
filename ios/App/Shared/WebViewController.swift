import UIKit
import WebKit

/// 整个 App 只有这一个界面：全屏 WKWebView。
///   · 在线版（FireflyOnline）→ 直接加载 https://lkerylm.github.io/，内容和网页永远同步
///   · 离线版（FireflyOffline）→ 通过 app://localhost/ 读 App 里打好的站点，断网也能看
final class WebViewController: UIViewController {
	private let mode = AppEnvironment.mode
	private let progressView = UIProgressView(progressViewStyle: .default)
	private let retryView = RetryView()
	private var progressObservation: NSKeyValueObservation?
	private lazy var webView: WKWebView = makeWebView()

	private var startURL: URL {
		switch mode {
		case .online:
			return AppEnvironment.onlineURL
		case .offline:
			let scheme = LocalSchemeHandler.scheme
			let host = LocalSchemeHandler.host
			return URL(string: "\(scheme)://\(host)/") ?? AppEnvironment.onlineURL
		}
	}

	deinit {
		progressObservation?.invalidate()
	}

	override func viewDidLoad() {
		super.viewDidLoad()
		view.backgroundColor = AppEnvironment.themeColor

		webView.translatesAutoresizingMaskIntoConstraints = false
		progressView.translatesAutoresizingMaskIntoConstraints = false
		retryView.translatesAutoresizingMaskIntoConstraints = false

		view.addSubview(webView)
		view.addSubview(progressView)
		view.addSubview(retryView)

		NSLayoutConstraint.activate([
			webView.topAnchor.constraint(equalTo: view.topAnchor),
			webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
			webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
			webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

			progressView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
			progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
			progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
			progressView.heightAnchor.constraint(equalToConstant: 2),

			retryView.topAnchor.constraint(equalTo: view.topAnchor),
			retryView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
			retryView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
			retryView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
		])

		progressView.progressTintColor = UIColor(red: 1.0, green: 0.56, blue: 0.75, alpha: 1.0)
		progressView.trackTintColor = .clear
		progressView.progress = 0
		progressView.isHidden = true
		retryView.isHidden = true

		retryView.onRetry = { [weak self] in
			guard let self else { return }
			self.retryView.isHidden = true
			self.loadStartPage()
		}

		let refresh = UIRefreshControl()
		refresh.tintColor = UIColor(red: 1.0, green: 0.56, blue: 0.75, alpha: 1.0)
		refresh.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
		webView.scrollView.refreshControl = refresh

		observeProgress()
		loadStartPage()
	}

	override var preferredStatusBarStyle: UIStatusBarStyle {
		.default
	}

	// MARK: - 构建

	private func makeWebView() -> WKWebView {
		let configuration = WKWebViewConfiguration()
		configuration.allowsInlineMediaPlayback = true
		configuration.websiteDataStore = .default()
		// 关键：UA 末尾追加 FireflyApp/<版本>，前端据此判定「已经在 App 里」，
		// 不再弹「添加到主屏幕」提示（见 PwaManager.astro 的 isFireflyShell）
		configuration.applicationNameForUserAgent = AppEnvironment.userAgentSuffix

		if mode == .offline, let root = AppEnvironment.bundledWebRoot {
			configuration.setURLSchemeHandler(
				LocalSchemeHandler(root: root),
				forURLScheme: LocalSchemeHandler.scheme
			)
		}

		let webView = WKWebView(frame: .zero, configuration: configuration)
		webView.navigationDelegate = self
		webView.uiDelegate = self
		webView.allowsBackForwardNavigationGestures = true
		webView.allowsLinkPreview = true
		webView.isOpaque = false
		webView.backgroundColor = AppEnvironment.themeColor
		webView.scrollView.backgroundColor = AppEnvironment.themeColor
		return webView
	}

	private func observeProgress() {
		progressObservation = webView.observe(\.estimatedProgress, options: [.new]) {
			[weak self] webView, _ in
			guard let self else { return }
			let progress = Float(webView.estimatedProgress)
			self.progressView.isHidden = progress >= 1
			self.progressView.setProgress(progress, animated: true)
		}
	}

	// MARK: - 加载

	private func loadStartPage() {
		webView.load(URLRequest(url: startURL))
	}

	@objc private func handleRefresh() {
		if webView.url == nil {
			loadStartPage()
		} else {
			webView.reload()
		}
	}

	/// 站内链接（在线版比 host，离线版比自定义协议）留在 webView 里，其余交给 Safari / 系统
	func isInternalURL(_ url: URL) -> Bool {
		let scheme = url.scheme?.lowercased() ?? ""
		if scheme == "about" || scheme == "data" {
			return true
		}

		switch mode {
		case .offline:
			return scheme == LocalSchemeHandler.scheme
		case .online:
			guard scheme == "http" || scheme == "https" else { return false }
			guard let host = url.host else { return false }
			return host == (startURL.host ?? "lkerylm.github.io")
		}
	}

	func openExternally(_ url: URL) {
		let scheme = url.scheme?.lowercased() ?? ""
		guard ["http", "https", "mailto", "tel", "sms"].contains(scheme) else { return }
		UIApplication.shared.open(url)
	}

	func showError(_ error: Error) {
		progressView.isHidden = true
		retryView.message = error.localizedDescription
		retryView.isHidden = false
		webView.scrollView.refreshControl?.endRefreshing()
	}
}

// MARK: - 站内跳转留在 App 里，站外链接交给 Safari

extension WebViewController: WKNavigationDelegate {
	func webView(
		_ webView: WKWebView,
		decidePolicyFor navigationAction: WKNavigationAction,
		decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
	) {
		guard let url = navigationAction.request.url else {
			decisionHandler(.allow)
			return
		}

		guard isInternalURL(url) else {
			openExternally(url)
			decisionHandler(.cancel)
			return
		}

		// 站内 target="_blank" 的链接（比如下载页里指向 /ios/ 的按钮）就在当前页面打开
		if navigationAction.targetFrame == nil, url.absoluteString != "about:blank" {
			webView.load(URLRequest(url: url))
			decisionHandler(.cancel)
			return
		}

		decisionHandler(.allow)
	}

	func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
		progressView.isHidden = true
		retryView.isHidden = true
		webView.scrollView.refreshControl?.endRefreshing()
	}

	func webView(
		_ webView: WKWebView,
		didFailProvisionalNavigation navigation: WKNavigation!,
		withError error: Error
	) {
		// 用户自己取消（例如点了别的链接）不算错误，别弹「没连上网」
		let nsError = error as NSError
		if nsError.domain == NSURLErrorDomain, nsError.code == NSURLErrorCancelled {
			return
		}
		showError(error)
	}

	func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
		showError(error)
	}
}

// MARK: - JS 弹窗（alert / confirm）

extension WebViewController: WKUIDelegate {
	func webView(
		_ webView: WKWebView,
		createWebViewWith configuration: WKWebViewConfiguration,
		for navigationAction: WKNavigationAction,
		windowFeatures: WKWindowFeatures
	) -> WKWebView? {
		if let url = navigationAction.request.url {
			if isInternalURL(url) {
				webView.load(URLRequest(url: url))
			} else {
				openExternally(url)
			}
		}
		return nil
	}

	func webView(
		_ webView: WKWebView,
		runJavaScriptAlertPanelWithMessage message: String,
		initiatedByFrame frame: WKFrameInfo,
		completionHandler: @escaping () -> Void
	) {
		let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
		alert.addAction(UIAlertAction(title: "好", style: .default) { _ in completionHandler() })
		present(alert, animated: true)
	}

	func webView(
		_ webView: WKWebView,
		runJavaScriptConfirmPanelWithMessage message: String,
		initiatedByFrame frame: WKFrameInfo,
		completionHandler: @escaping (Bool) -> Void
	) {
		let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
		alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(false) })
		alert.addAction(UIAlertAction(title: "确定", style: .default) { _ in completionHandler(true) })
		present(alert, animated: true)
	}
}

// MARK: - 断网 / 加载失败时的兜底界面

private final class RetryView: UIView {
	var onRetry: (() -> Void)?

	var message: String? {
		get { detailLabel.text }
		set { detailLabel.text = newValue }
	}

	private let emojiLabel = UILabel()
	private let titleLabel = UILabel()
	private let detailLabel = UILabel()
	private let button = UIButton(type: .system)

	init() {
		super.init(frame: .zero)
		backgroundColor = AppEnvironment.themeColor

		emojiLabel.text = "🌸"
		emojiLabel.font = .systemFont(ofSize: 40)
		emojiLabel.textAlignment = .center

		titleLabel.text = "没连上网"
		titleLabel.font = .systemFont(ofSize: 17, weight: .semibold)
		titleLabel.textColor = UIColor(red: 0.36, green: 0.24, blue: 0.30, alpha: 1.0)
		titleLabel.textAlignment = .center

		detailLabel.font = .systemFont(ofSize: 13)
		detailLabel.textColor = UIColor(red: 0.46, green: 0.36, blue: 0.42, alpha: 1.0)
		detailLabel.numberOfLines = 0
		detailLabel.textAlignment = .center
		detailLabel.text = "检查一下 Wi-Fi 或流量，然后点下面重试"

		var configuration = UIButton.Configuration.filled()
		configuration.title = "重新加载"
		configuration.baseBackgroundColor = UIColor(red: 1.0, green: 0.44, blue: 0.66, alpha: 1.0)
		configuration.baseForegroundColor = .white
		configuration.cornerStyle = .capsule
		configuration.contentInsets = NSDirectionalEdgeInsets(
			top: 10,
			leading: 26,
			bottom: 10,
			trailing: 26
		)
		button.configuration = configuration
		button.addTarget(self, action: #selector(handleTap), for: .touchUpInside)

		let stack = UIStackView(arrangedSubviews: [emojiLabel, titleLabel, detailLabel, button])
		stack.axis = .vertical
		stack.alignment = .center
		stack.spacing = 12
		stack.translatesAutoresizingMaskIntoConstraints = false
		addSubview(stack)

		NSLayoutConstraint.activate([
			stack.centerXAnchor.constraint(equalTo: centerXAnchor),
			stack.centerYAnchor.constraint(equalTo: centerYAnchor),
			stack.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 28),
			stack.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -28)
		])
	}

	required init?(coder: NSCoder) {
		fatalError("init(coder:) has not been implemented")
	}

	@objc private func handleTap() {
		onRetry?()
	}
}
