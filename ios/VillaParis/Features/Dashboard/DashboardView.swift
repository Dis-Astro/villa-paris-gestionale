import SwiftUI

struct DashboardView: View {
    @Environment(AuthStore.self) private var auth
    @State private var calendar = CalendarStore()

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Buongiorno")
                        .font(.title.bold())
                    Text(auth.user?.email ?? "Villa Paris")
                        .foregroundStyle(.secondary)
                }

                if case .failed(let message) = calendar.state {
                    ContentUnavailableView("Dati non disponibili", systemImage: "wifi.exclamationmark", description: Text(message))
                } else if case .loading = calendar.state {
                    ProgressView("Aggiornamento agenda…")
                } else {
                    HStack(spacing: 12) {
                        MetricCard(title: "Eventi", value: calendar.events.count, symbol: "party.popper.fill", color: .purple)
                        MetricCard(title: "Appuntamenti", value: calendar.appointments.count, symbol: "person.2.fill", color: .orange)
                    }

                    Text("Prossimi impegni")
                        .font(.headline)

                    ForEach(upcomingItems.prefix(6)) { item in
                        HStack(spacing: 12) {
                            Image(systemName: item.symbol)
                                .frame(width: 36, height: 36)
                                .background(item.color.opacity(0.12), in: Circle())
                                .foregroundStyle(item.color)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(item.title).font(.subheadline.bold())
                                Text(item.date, format: .dateTime.day().month().hour().minute())
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                        .padding()
                        .background(.background, in: RoundedRectangle(cornerRadius: 16))
                        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
                    }
                }
            }
            .padding()
        }
        .background(Color(uiColor: .secondarySystemBackground))
        .navigationTitle("Villa Paris")
        .refreshable { await calendar.load() }
        .task { await calendar.load() }
    }

    private var upcomingItems: [AgendaItem] {
        let events = calendar.events.compactMap { event -> AgendaItem? in
            guard let date = event.dataConfermata else { return nil }
            return AgendaItem(id: "e-\(event.id)", title: event.titolo, date: date, symbol: "party.popper", color: .purple)
        }
        let appointments = calendar.appointments.map {
            AgendaItem(id: "a-\($0.id)", title: $0.clientePrincipale.fullName, date: $0.dataAppuntamento, symbol: "person.2", color: .orange)
        }
        return (events + appointments).filter { $0.date >= .now }.sorted { $0.date < $1.date }
    }
}

private struct AgendaItem: Identifiable {
    let id: String
    let title: String
    let date: Date
    let symbol: String
    let color: Color
}

private struct MetricCard: View {
    let title: String
    let value: Int
    let symbol: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: symbol).foregroundStyle(color)
            Text(value, format: .number).font(.title.bold())
            Text(title).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 16))
    }
}
