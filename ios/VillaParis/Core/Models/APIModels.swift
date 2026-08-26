import Foundation

struct APIUser: Codable, Sendable, Equatable {
    let id: String
    let email: String
    let role: String
    let isActive: Bool
}

struct MobileSessionResponse: Codable, Sendable {
    let apiVersion: String
    let tokenType: String
    let accessToken: String
    let accessTokenExpiresAt: Date
    let refreshToken: String
    let refreshTokenExpiresAt: Date
    let user: APIUser
}

struct BootstrapResponse: Codable, Sendable {
    struct Capabilities: Codable, Sendable {
        let canEditOperationalData: Bool
        let canViewReports: Bool
        let canUseAI: Bool
        let canManageUsers: Bool
    }

    struct Features: Codable, Sendable {
        let calendar: Bool
        let appointments: Bool
        let clients: Bool
        let reports: Bool
        let aiAssistant: Bool
        let audioAppointmentCapture: Bool
        let pushNotifications: Bool
    }

    let apiVersion: String
    let serverTime: Date
    let minimumSupportedIOSVersion: String
    let user: APIUser
    let capabilities: Capabilities
    let features: Features
}

struct MobileCalendarResponse: Codable, Sendable {
    struct Range: Codable, Sendable { let from: Date; let to: Date }

    struct Event: Codable, Identifiable, Sendable {
        let id: Int
        let titolo: String
        let tipo: String
        let dataConfermata: Date?
        let fascia: String
        let stato: String
        let personePreviste: Int?
        let luogo: String?
    }

    struct ClientSummary: Codable, Sendable {
        let id: Int
        let nome: String
        let cognome: String?

        var fullName: String { [nome, cognome].compactMap { $0 }.joined(separator: " ") }
    }

    struct Appointment: Codable, Identifiable, Sendable {
        let id: Int
        let dataAppuntamento: Date
        let durataMinuti: Int?
        let esito: String?
        let statoFunnel: String?
        let tipoEventoRichiesto: String?
        let personePreviste: Int?
        let clientePrincipale: ClientSummary
    }

    let apiVersion: String
    let range: Range
    let events: [Event]
    let appointments: [Appointment]
}

struct APIErrorEnvelope: Codable, Sendable {
    struct Detail: Codable, Sendable { let code: String?; let message: String }
    let error: Detail
}
