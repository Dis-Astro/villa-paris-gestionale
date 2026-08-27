import SwiftUI
import WebKit

struct FullManagementView: View {
    var body: some View {
        VillaParisWebView()
            .ignoresSafeArea(.container, edges: .bottom)
    }
}

private struct VillaParisWebView: UIViewRepresentable {
    private static let lastRouteKey = "villaParis.lastWebRoute"

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.96, green: 0.95, blue: 0.93, alpha: 1)
        webView.customUserAgent = "VillaParis-iPad/3.0"
        webView.navigationDelegate = context.coordinator

        let initialRoute = UserDefaults.standard.string(forKey: Self.lastRouteKey)
            .flatMap { $0.hasPrefix("/") && !$0.hasPrefix("/login") ? $0 : nil }
            ?? "/dashboard"

        guard
            let rawBaseURL = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
            let baseURL = URL(string: rawBaseURL),
            let dashboardURL = URL(string: initialRoute, relativeTo: baseURL)?.absoluteURL
        else {
            assertionFailure("API_BASE_URL mancante o non valido")
            return webView
        }

        webView.load(URLRequest(url: dashboardURL))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard
                let url = webView.url,
                url.path != "/login",
                let rawBaseURL = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
                let baseURL = URL(string: rawBaseURL),
                url.host == baseURL.host
            else { return }

            var route = url.path.isEmpty ? "/dashboard" : url.path
            if let query = URLComponents(url: url, resolvingAgainstBaseURL: false)?.percentEncodedQuery,
               !query.isEmpty {
                route += "?\(query)"
            }
            UserDefaults.standard.set(route, forKey: VillaParisWebView.lastRouteKey)
        }
    }
}
