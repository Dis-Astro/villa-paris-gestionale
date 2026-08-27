import Foundation
import UIKit

enum APIClientError: LocalizedError {
    case invalidConfiguration
    case invalidResponse
    case unauthorized
    case server(String)
    case secureStorage

    var errorDescription: String? {
        switch self {
        case .invalidConfiguration: "Indirizzo del gestionale non configurato."
        case .invalidResponse: "Risposta del server non valida."
        case .unauthorized: "Sessione scaduta. Accedi di nuovo."
        case .server(let message): message
        case .secureStorage: "Impossibile proteggere la sessione sul dispositivo."
        }
    }
}

actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let baseURL: URL
    private let decoder: JSONDecoder
    private let encoder = JSONEncoder()
    private var accessToken: String?
    private var refreshToken: String?
    private var refreshTask: Task<MobileSessionResponse, Error>?

    init(session: URLSession = .shared) {
        self.session = session
        guard let rawURL = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
              let url = URL(string: rawURL) else {
            preconditionFailure("API_BASE_URL mancante o non valido")
        }
        self.baseURL = url
        self.decoder = JSONDecoder.villaParis
    }

    func restoreTokens() {
        accessToken = KeychainStore.read("accessToken")
        refreshToken = KeychainStore.read("refreshToken")
    }

    func login(email: String, password: String) async throws -> MobileSessionResponse {
        struct LoginBody: Encodable { let email: String; let password: String; let deviceName: String }
        let deviceName = await MainActor.run { UIDevice.current.name }
        let result: MobileSessionResponse = try await send(
            path: "/api/v1/mobile/auth/login",
            method: "POST",
            body: LoginBody(email: email, password: password, deviceName: deviceName),
            authenticated: false
        )
        try persist(result)
        return result
    }

    func bootstrap() async throws -> BootstrapResponse {
        try await send(path: "/api/v1/mobile/bootstrap")
    }

    func calendar(from: Date, to: Date) async throws -> MobileCalendarResponse {
        var components = URLComponents()
        components.queryItems = [
            URLQueryItem(name: "from", value: ISO8601DateFormatter.villaParis.string(from: from)),
            URLQueryItem(name: "to", value: ISO8601DateFormatter.villaParis.string(from: to))
        ]
        return try await send(path: "/api/v1/mobile/calendar?\(components.percentEncodedQuery ?? "")")
    }

    func logout() async {
        struct LogoutBody: Encodable { let refreshToken: String }
        if let refreshToken {
            let _: EmptyResponse? = try? await send(
                path: "/api/v1/mobile/auth/logout",
                method: "POST",
                body: LogoutBody(refreshToken: refreshToken)
            )
        }
        clearTokens()
    }

    private func send<Response: Decodable>(
        path: String,
        method: String = "GET",
        authenticated: Bool = true,
        retryAfterRefresh: Bool = true
    ) async throws -> Response {
        try await send(path: path, method: method, bodyData: nil, authenticated: authenticated, retryAfterRefresh: retryAfterRefresh)
    }

    private func send<Response: Decodable, Body: Encodable>(
        path: String,
        method: String,
        body: Body,
        authenticated: Bool = true,
        retryAfterRefresh: Bool = true
    ) async throws -> Response {
        try await send(
            path: path,
            method: method,
            bodyData: try encoder.encode(body),
            authenticated: authenticated,
            retryAfterRefresh: retryAfterRefresh
        )
    }

    private func send<Response: Decodable>(
        path: String,
        method: String,
        bodyData: Data?,
        authenticated: Bool,
        retryAfterRefresh: Bool
    ) async throws -> Response {
        guard let url = URL(string: path, relativeTo: baseURL)?.absoluteURL else { throw APIClientError.invalidConfiguration }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 45
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("VillaParis-iOS/1", forHTTPHeaderField: "X-Client")
        if let bodyData {
            request.httpBody = bodyData
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if authenticated, let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIClientError.invalidResponse }

        if http.statusCode == 401, authenticated, retryAfterRefresh {
            _ = try await refreshSession()
            return try await send(
                path: path,
                method: method,
                bodyData: bodyData,
                authenticated: true,
                retryAfterRefresh: false
            )
        }
        guard (200..<300).contains(http.statusCode) else {
            if let envelope = try? decoder.decode(APIErrorEnvelope.self, from: data) {
                throw APIClientError.server(envelope.error.message)
            }
            throw http.statusCode == 401 ? APIClientError.unauthorized : APIClientError.server("Errore del server (\(http.statusCode)).")
        }
        if Response.self == EmptyResponse.self, data.isEmpty {
            return EmptyResponse() as! Response
        }
        return try decoder.decode(Response.self, from: data)
    }

    private func refreshSession() async throws -> MobileSessionResponse {
        if let refreshTask { return try await refreshTask.value }
        guard let refreshToken else { throw APIClientError.unauthorized }
        struct RefreshBody: Encodable { let refreshToken: String; let deviceName: String }
        let deviceName = await MainActor.run { UIDevice.current.name }

        let task = Task { [session, baseURL, decoder, encoder, deviceName] in
            guard let url = URL(string: "/api/v1/mobile/auth/refresh", relativeTo: baseURL)?.absoluteURL else {
                throw APIClientError.invalidConfiguration
            }
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try encoder.encode(RefreshBody(refreshToken: refreshToken, deviceName: deviceName))
            let (data, response) = try await session.data(for: request)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                throw APIClientError.unauthorized
            }
            return try decoder.decode(MobileSessionResponse.self, from: data)
        }
        refreshTask = task
        defer { refreshTask = nil }
        do {
            let result = try await task.value
            try persist(result)
            return result
        } catch {
            clearTokens()
            throw error
        }
    }

    private func persist(_ session: MobileSessionResponse) throws {
        try KeychainStore.write(session.accessToken, account: "accessToken")
        try KeychainStore.write(session.refreshToken, account: "refreshToken")
        accessToken = session.accessToken
        refreshToken = session.refreshToken
    }

    private func clearTokens() {
        accessToken = nil
        refreshToken = nil
        KeychainStore.delete("accessToken")
        KeychainStore.delete("refreshToken")
    }
}

private struct EmptyResponse: Codable {}

extension JSONDecoder {
    static var villaParis: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let value = try container.decode(String.self)
            if let date = ISO8601DateFormatter.villaParisFractional.date(from: value) ?? ISO8601DateFormatter.villaParis.date(from: value) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Data ISO 8601 non valida")
        }
        return decoder
    }
}

extension ISO8601DateFormatter {
    static let villaParis: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static let villaParisFractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
