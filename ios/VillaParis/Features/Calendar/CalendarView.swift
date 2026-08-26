import SwiftUI

struct CalendarView: View {
    @State private var store = CalendarStore()

    var body: some View {
        Group {
            switch store.state {
            case .idle, .loading:
                ProgressView("Caricamento calendario…")
            case .failed(let message):
                ContentUnavailableView {
                    Label("Calendario non disponibile", systemImage: "calendar.badge.exclamationmark")
                } description: {
                    Text(message)
                } actions: {
                    Button("Riprova") { Task { await store.load() } }
                }
            case .loaded:
                List {
                    if !store.appointments.isEmpty {
                        Section("Appuntamenti") {
                            ForEach(store.appointments) { appointment in
                                CalendarRow(
                                    title: appointment.clientePrincipale.fullName,
                                    subtitle: appointment.tipoEventoRichiesto ?? "Appuntamento",
                                    date: appointment.dataAppuntamento,
                                    symbol: "person.2.fill",
                                    color: .orange
                                )
                            }
                        }
                    }
                    if !store.events.isEmpty {
                        Section("Eventi") {
                            ForEach(store.events) { event in
                                CalendarRow(
                                    title: event.titolo,
                                    subtitle: [event.tipo, event.luogo].compactMap { $0 }.joined(separator: " · "),
                                    date: event.dataConfermata,
                                    symbol: "party.popper.fill",
                                    color: .purple
                                )
                            }
                        }
                    }
                }
                .refreshable { await store.load() }
            }
        }
        .navigationTitle("Calendario")
        .task { if case .idle = store.state { await store.load() } }
    }
}

private struct CalendarRow: View {
    let title: String
    let subtitle: String
    let date: Date?
    let symbol: String
    let color: Color

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: symbol)
                .foregroundStyle(color)
                .frame(width: 34)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.headline)
                if !subtitle.isEmpty { Text(subtitle).font(.subheadline).foregroundStyle(.secondary) }
                if let date {
                    Text(date, format: .dateTime.weekday().day().month().hour().minute())
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
