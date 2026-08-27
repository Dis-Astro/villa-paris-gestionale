import SwiftUI
import UIKit

struct RootView: View {
    @Environment(AuthStore.self) private var auth

    var body: some View {
        if UIDevice.current.userInterfaceIdiom == .pad {
            FullManagementView()
        } else {
            NativeSessionView()
                .task { await auth.restore() }
        }
    }
}

private struct NativeSessionView: View {
    @Environment(AuthStore.self) private var auth

    var body: some View {
        Group {
            switch auth.state {
            case .restoring:
                ProgressView("Connessione a Villa Paris…")
            case .signedOut:
                LoginView()
            case .signedIn:
                AppTabView()
            }
        }
        .animation(.easeInOut, value: auth.state)
    }
}

private struct AppTabView: View {
    var body: some View {
        TabView {
            NavigationStack { DashboardView() }
                .tabItem { Label("Oggi", systemImage: "house") }

            NavigationStack { CalendarView() }
                .tabItem { Label("Calendario", systemImage: "calendar") }

            NavigationStack { SettingsView() }
                .tabItem { Label("Impostazioni", systemImage: "gearshape") }
        }
        .tint(Color(red: 0.09, green: 0.24, blue: 0.22))
    }
}
