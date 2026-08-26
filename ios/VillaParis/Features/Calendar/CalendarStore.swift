import Foundation
import Observation

@MainActor
@Observable
final class CalendarStore {
    enum State { case idle, loading, loaded, failed(String) }

    var state: State = .idle
    var events: [MobileCalendarResponse.Event] = []
    var appointments: [MobileCalendarResponse.Appointment] = []

    func load() async {
        state = .loading
        let calendar = Calendar.current
        let from = calendar.date(byAdding: .day, value: -7, to: .now) ?? .now
        let to = calendar.date(byAdding: .day, value: 90, to: .now) ?? .now
        do {
            let response = try await APIClient.shared.calendar(from: from, to: to)
            guard !Task.isCancelled else { return }
            events = response.events
            appointments = response.appointments
            state = .loaded
        } catch is CancellationError {
            return
        } catch {
            state = .failed(error.localizedDescription)
        }
    }
}
