import SwiftUI

@main
struct VillaParisApp: App {
    @State private var authStore = AuthStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(authStore)
                .task { await authStore.restore() }
        }
    }
}
