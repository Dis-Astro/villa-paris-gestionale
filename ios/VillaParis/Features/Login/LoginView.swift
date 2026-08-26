import SwiftUI

struct LoginView: View {
    @Environment(AuthStore.self) private var auth
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        @Bindable var auth = auth
        NavigationStack {
            Form {
                Section {
                    VStack(spacing: 12) {
                        Image(systemName: "building.2.crop.circle.fill")
                            .font(.system(size: 58))
                            .foregroundStyle(.purple)
                        Text("Villa Paris")
                            .font(.largeTitle.bold())
                        Text("Gestionale operativo")
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                }

                Section("Accesso") {
                    TextField("Email", text: $email)
                        .textContentType(.username)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                    SecureField("Password", text: $password)
                        .textContentType(.password)
                }

                if let message = auth.errorMessage {
                    Section { Text(message).foregroundStyle(.red) }
                }

                Button {
                    Task { await auth.login(email: email, password: password) }
                } label: {
                    if auth.isWorking {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Accedi").frame(maxWidth: .infinity)
                    }
                }
                .disabled(email.isEmpty || password.isEmpty || auth.isWorking)
            }
        }
    }
}
