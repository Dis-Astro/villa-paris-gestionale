import SwiftUI

struct SettingsView: View {
    @Environment(AuthStore.self) private var auth

    var body: some View {
        List {
            Section("Account") {
                LabeledContent("Email", value: auth.user?.email ?? "—")
                LabeledContent("Ruolo", value: auth.user?.role ?? "—")
            }

            Section("Connessione") {
                LabeledContent("API", value: "v\(auth.bootstrap?.apiVersion ?? "1")")
                LabeledContent("Calendario", value: auth.bootstrap?.features.calendar == true ? "Attivo" : "Non disponibile")
                LabeledContent("Assistente AI", value: auth.bootstrap?.features.aiAssistant == true ? "Attivo" : "Non autorizzato")
                LabeledContent("Notifiche push", value: auth.bootstrap?.features.pushNotifications == true ? "Attive" : "Da configurare")
            }

            Section {
                Button("Esci", role: .destructive) {
                    Task { await auth.logout() }
                }
                .disabled(auth.isWorking)
            }
        }
        .navigationTitle("Impostazioni")
    }
}
