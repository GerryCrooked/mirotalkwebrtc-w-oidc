
# MiroTalk-WebRTC mit Keycloak OIDC-Integration

Dieses Repository ist ein Fork von [MiroTalk-WebRTC](https://github.com/miroslavpejic85/mirotalkwebrtc), erweitert um die Integration von **Keycloak** für die Authentifizierung über **OpenID Connect (OIDC)**. 

## Änderungen zum Original-Master

### 1. **Keycloak OIDC-Integration**
- Integration von Keycloak als Identity Provider (IdP) zur zentralen Authentifizierung.
- Nutzung von `passport-openidconnect`, um die Authentifizierung in der `server.js` zu implementieren.
- Anpassungen der Routen (`/client` und `/config`), um sie durch OIDC-Authentifizierung zu schützen.
- Hinzufügen einer Logout-Route (`/logout`), die die Keycloak-Session beendet.

### 2. **Umgebungsvariablen und Templates**
- **Neue Umgebungsvariablen**:
  - Keycloak-spezifische Konfigurationen (`KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CALLBACK_URL` usw.) in der Datei `.env.template`.
  - Nutzung von `SESSION_SECRET` für die Sitzungsverwaltung in `express-session`.
- **Template-Dateien**:
  - `.env.template` enthält alle erforderlichen Umgebungsvariablen.
  - `docker-compose.template.yml` dient als Vorlage für die Docker-Compose-Konfiguration.

### 3. **Docker-Anpassungen**
- Aktualisierung des `Dockerfile`:
  - Entfernen des festen Bezugs auf `.env.template` zugunsten eines flexiblen Kopierprozesses durch den Benutzer.
  - Minimale Änderungen, um sicherzustellen, dass die Anwendung mit Keycloak kompatibel bleibt.
- Verwendung von `env_file` in `docker-compose.template.yml`, um Umgebungsvariablen aus der `.env`-Datei zu laden.

### 4. **Frontend-Integration**
- Sicherstellung, dass das Frontend korrekt mit den OIDC-Authentifizierungsabläufen interagiert.
- Möglichkeit, den Benutzer bei nicht authentifiziertem Zugriff automatisch zur Keycloak-Login-Seite weiterzuleiten.

---

## Einrichtung und Nutzung

### 1. Voraussetzungen
- **Keycloak**: Stelle sicher, dass eine Keycloak-Instanz verfügbar ist und die Client- und Realm-Konfiguration korrekt ist.
- **Docker & Docker Compose**: Installiere Docker, um die Anwendung auszuführen.

### 2. Einrichtung

1. **Repository klonen**:
   ```bash
   git clone https://github.com/GerryCrooked/mirotalkwebrtc-w-oidc.git
   cd mirotalkwebrtc-w-oidc
   ```

2. **Template-Dateien kopieren**:
   - Kopiere die Templates und passe sie an:
     ```bash
     cp .env.template .env
     cp docker-compose.template.yml docker-compose.yml
     ```

3. **Konfiguration anpassen**:
   - Öffne die `.env`-Datei und trage die Werte für Keycloak und andere Einstellungen ein:
     ```env
     KEYCLOAK_ISSUER=https://keycloak-server/realms/your-realm
     KEYCLOAK_CLIENT_ID=mirotalk-client
     KEYCLOAK_CLIENT_SECRET=your-client-secret
     KEYCLOAK_CALLBACK_URL=http://localhost:9000/client
     ```

4. **Docker-Container starten**:
   - Baue und starte die Anwendung mit Docker Compose:
     ```bash
     docker-compose up --build
     ```

5. **Keycloak einrichten**:
   - Erstelle einen neuen Client in Keycloak:
     - **Client ID**: `mirotalk-client`
     - **Redirect URIs**: `http://localhost:9000/*`
     - **Access Type**: `confidential`

---

## Zusätzliche Hinweise

- **Trennung von Keycloak**: Keycloak läuft nicht im selben Docker-Stack wie MiroTalk-WebRTC. Stelle sicher, dass Keycloak über HTTPS erreichbar ist.
- **HTTPS**: Für die Produktion sollte der Server über HTTPS laufen, da OIDC sensible Daten überträgt.
- **Fehlersuche**:
  - Überprüfe die Logs von Keycloak und MiroTalk-WebRTC, wenn Authentifizierungsprobleme auftreten.
  - Stelle sicher, dass die Umgebungsvariablen korrekt gesetzt sind.


---

Falls du weitere Anpassungen oder Features hinzufügen möchtest, zögere nicht, einen Pull Request zu erstellen oder ein Issue zu melden! 🎉
