# info@neosolar.ch mit dem CRM verbinden

Damit das CRM automatische Mails verschicken kann – Nachfassen bei offenen
Angeboten, Offerten, Portal-Einladungen – braucht es ein Postfach, das nicht
von einem angemeldeten Benutzer abhängt.

## Warum nicht der bisherige Weg

Bisher lief der Versand über die persönliche Outlook-Verbindung des
Verkäufers. Das hat zwei Haken: Wer sich nie verbunden hat, verschickt nichts,
und das Token läuft nach längerer Inaktivität ab. Automatische Nachfassmails
würden dann still aufhören – schlimmer, als sie gar nicht erst zu versprechen.

Deshalb holt sich der Server jetzt ein eigenes Token und sendet als
`info@neosolar.ch`. Antworten gehen trotzdem an den zuständigen Verkäufer,
und er bekommt eine Kopie.

## Einmalige Einrichtung im Azure-Portal

Nötig ist ein Konto mit Administratorrechten im Microsoft-365-Tenant von
NEOSOLAR. Der Schritt mit der Administratorzustimmung lässt sich nicht
umgehen und nicht aus dem CRM heraus erledigen.

1. **Azure-Portal → Microsoft Entra ID → App-Registrierungen**
   Die vorhandene Registrierung des CRM öffnen oder eine neue anlegen.

2. **Übersicht** – drei Werte notieren:
   - *Anwendungs-ID (Client)* → `MS_CLIENT_ID`
   - *Verzeichnis-ID (Mandant)* → `MS_TENANT_ID`
     Wichtig: die echte ID, nicht `common`. Client Credentials brauchen den
     konkreten Tenant.

3. **Zertifikate & Geheimnisse → Neuer geheimer Clientschlüssel**
   Den Wert sofort kopieren, er wird nur einmal angezeigt → `MS_CLIENT_SECRET`.
   Ablaufdatum notieren; danach muss der Schlüssel erneuert werden.

4. **API-Berechtigungen → Berechtigung hinzufügen → Microsoft Graph →
   Anwendungsberechtigungen** (nicht Delegiert):
   - `Mail.Send` – zum Versenden
   - `User.Read.All` – damit die Statusprüfung das Postfach findet

5. **Administratorzustimmung für NEOSOLAR erteilen** – der Knopf über der
   Berechtigungsliste. Ohne diesen Schritt bleibt der Versand gesperrt.

6. **Empfohlen: Zugriff einschränken.** Ohne weitere Einschränkung darf die
   App als *jedes* Postfach im Tenant senden. In der Exchange Online
   PowerShell begrenzen:

   ```powershell
   New-ApplicationAccessPolicy `
     -AppId <MS_CLIENT_ID> `
     -PolicyScopeGroupId info@neosolar.ch `
     -AccessRight RestrictAccess `
     -Description "NEOSOLAR CRM darf nur als info@ senden"
   ```

## Werte im CRM hinterlegen

Die vier Werte gehören in die Umgebung der Netlify-Funktion:

**Netlify → Site configuration → Environment variables**

| Variable | Wert |
|---|---|
| `MS_CLIENT_ID` | Anwendungs-ID aus Schritt 2 |
| `MS_CLIENT_SECRET` | Geheimnis aus Schritt 3 |
| `MS_TENANT_ID` | Verzeichnis-ID aus Schritt 2 |
| `MS_SENDER_ADDRESS` | `info@neosolar.ch` |

Danach einmal neu deployen, sonst kennt die Funktion die Werte nicht.

## Prüfen, ob es läuft

Als Admin oder GL angemeldet:

```
GET  /api/v1/outlook/system/status
POST /api/v1/outlook/system/test   { "an": "marcel.steiert@neosolar.ch" }
```

Der Status meldet drei Stufen: ob die Variablen gesetzt sind, ob ein Token
kommt, und ob das Postfach erreichbar ist. Erst wenn alle drei stimmen, ist
`bereitFuerAutomatik` wahr.

Häufige Rückmeldungen:

| Meldung | Ursache |
|---|---|
| Variablen fehlen | Umgebung nicht gesetzt oder nicht neu deployt |
| `AADSTS7000215` | Falscher oder abgelaufener Clientschlüssel |
| `AADSTS900023` | `MS_TENANT_ID` steht auf `common` statt der echten ID |
| Zugriff verweigert beim Senden | Administratorzustimmung fehlt, oder die Application Access Policy sperrt das Postfach |
| Postfach nicht erreichbar | Adresse existiert nicht, oder `User.Read.All` fehlt |

## Wie der Versand danach entscheidet

Zwei Wege, die Reihenfolge hängt vom Anlass ab:

- **Automatisches Nachfassen** → zuerst `info@neosolar.ch`, damit es
  unabhängig vom Verkäufer läuft. `replyTo` zeigt auf ihn, er bekommt eine Kopie.
- **Offerte, die der Verkäufer selbst verschickt** → zuerst sein eigenes
  Postfach, weil der Kunde ihn kennt. Ohne Verbindung übernimmt `info@`.

Fällt ein Weg aus, greift der andere. Erst wenn beide fehlen, wird der
Versand als fehlgeschlagen protokolliert und – beim Nachfassen – eine
Aufgabe für den Verkäufer erstellt.

Der Code dazu: `server/src/lib/mailVersand.ts` und
`server/src/lib/outlookClient.ts` (Abschnitt Systempostfach).
