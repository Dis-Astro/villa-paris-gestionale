import Foundation
import Observation

@MainActor
@Observable
final class AuthStore {
    enum State: Equatable { case restoring, signedOut, signedIn }

    var state: State = .restoring
    var user: APIUser?
    var bootstrap: BootstrapResponse?
    var errorMessage: String?
    var isWorking = false

    private let api = APIClient.shared

    func restore() async {
        await api.restoreTokens()
        do {
            let bootstrap = try await api.bootstrap()
            self.bootstrap = bootstrap
            user = bootstrap.user
            state = .signedIn
        } catch {
            state = .signedOut
        }
    }

    func login(email: String, password: String) async {
        guard !isWorking else { return }
        isWorking = true
        errorMessage = nil
        defer { isWorking = false }
        do {
            let session = try await api.login(email: email, password: password)
            user = session.user
            bootstrap = try await api.bootstrap()
            state = .signedIn
        } catch {
            errorMessage = error.localizedDescription
            state = .signedOut
        }
    }

    func logout() async {
        isWorking = true
        await api.logout()
        user = nil
        bootstrap = nil
        errorMessage = nil
        state = .signedOut
        isWorking = false
    }
}
