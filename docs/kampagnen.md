# Selbstplaner und Kampagnen

Zwei zusammenhängende Bausteine: eine Seite, auf der ein Interessent seine
Anlage selbst zusammenstellt, und ein Versandmodul, das Leads dorthin führt.

---

## Der Selbstplaner: `/planer`

Öffentlich, ohne Anmeldung. Fünf Schritte:

1. **Adresse** – der Kunde tippt Strasse und Ort, die Karte fliegt hin
2. **Dach** – die Fläche kommt aus dem Sonnendach-Kataster, Module werden
   automatisch gelegt. Ein Regler bestimmt den Belegungsgrad, einzelne Module
   lassen sich anklicken. Hat das Haus mehrere Dachflächen, kann er wählen.
3. **Verbrauch** – Jahresverbrauch, Strompreis, Speicher, dazu Wärmepumpe,
   E-Auto und Wallbox
4. **Ergebnis** – Ersparnis, Unabhängigkeit, Amortisation, Kostenaufstellung
   bis zu den effektiven Kosten nach Förderung
5. **Kontakt** – erst hier wird nach Namen gefragt

Gerechnet wird mit `pvCalculator.ts`, also derselben Engine wie im
Verkaufsgespräch. Die Zahlen laufen später nicht auseinander.

**Was im CRM ankommt:** ein Lead mit Quelle `PLANER` (oder `KAMPAGNE`, wenn er
über einen Kampagnenlink kam), mit der vollständigen Auslegung in den Notizen
und dem Belegungsbild unter *Dokumente → Termin*.

---

## Kampagnen

Admin → **Kampagnen**. Massenversand an Leads über das Systempostfach.

### Vorgehen beim Anlegen

1. **Neue Kampagne** – Name, Betreff und Text. Eine brauchbare Vorlage ist
   vorbelegt.
2. **Empfänger filtern** nach Quelle, Zeitraum und ob ein Angebot existiert.
   Der Knopf «Wie viele wären das?» zeigt die Zahl nach Abzug von
   Abmeldungen, Rückläufern und Dubletten.
3. **Testmail** an die eigene Adresse.
4. **Übernehmen** – die Empfänger werden der Kampagne fest zugeordnet.
5. **Starten.**

### Platzhalter

| Platzhalter | Wird ersetzt durch |
|---|---|
| `{anrede}` | Vorname, sonst «Guten Tag» |
| `{vorname}` `{nachname}` `{name}` | Namensfelder |
| `{ort}` | Ort aus der Adresse, sonst «Ihrer Gemeinde» |
| `{link}` | Link zum Selbstplaner, zählt den Klick |
| `{abmelden}` | Abmeldelink |

`{abmelden}` wird automatisch angehängt, falls es im Text fehlt. Ohne
Abmeldelink darf nicht versendet werden – das ist keine Einstellung.

### Tempo

Der Versand läuft werktags stündlich zwischen 8 und 17 Uhr und hält sich an
zwei Grenzen: das **Tagesbudget** der Kampagne und ihr **Zeitfenster**. Bei
100 Mails am Tag und stündlichem Lauf gehen also etwa zehn pro Stunde raus –
kein Schwall, der bei Empfängerservern auffällt.

### Was gezählt wird

- **Öffnung** über ein Zählpixel
- **Klick** über eine Weiterleitung
- **Anfrage**, wenn der Kunde im Planer das Formular ausfüllt

Der **erste Klick** ist ein Kaufsignal. Er landet als Aktivität im
Kontaktverlauf und erzeugt eine Aufgabe mit hoher Priorität – jetzt anrufen,
solange das Thema präsent ist. Pro Kontakt und Kampagne nur eine Aufgabe.

---

## Was fest eingebaut ist

Drei Dinge lassen sich nicht abschalten, weil ohne sie der Versand rechtlich
wie technisch scheitert.

**Abmeldelink.** In jeder Mail, plus der `List-Unsubscribe`-Kopf, damit
Outlook und Gmail einen eigenen Abmeldeknopf anbieten. Wer den benutzt,
markiert die Mail nicht als Spam – das schont die Reputation deutlich mehr,
als es der verlorene Empfänger kostet. Eine Abmeldung gilt für **alle**
Kampagnen, auch künftige.

**Rückläufer-Sperre.** Adressen, die als unzustellbar zurückkommen, landen in
`email_bounces` und werden übersprungen. Ohne das steigt die Rückläuferquote,
und der Anbieter blockiert den Versand.

**Tagesbudget.** Mehr als das eingestellte Kontingent geht pro Werktag nicht
raus, auch wenn zehntausend Empfänger warten.

---

## Zwei Punkte, die vor dem ersten Start geklärt sein müssen

### Absenderdomain

Der Versand läuft derzeit über `info@neosolar.ch`. Für ein paar hundert Mails
an Leute, die schon Kontakt mit NEOSOLAR hatten, geht das. Für zehntausende
kalte Adressen nicht: Ein Teil landet im Spam, ein Teil kommt zurück, ein
Teil wird als Spam markiert. Microsoft und die Empfängerprovider senken
daraufhin die Reputation der Domain `neosolar.ch` – und dann landen auch
Offerten, Terminbestätigungen und Rechnungen im Spam.

Wenn das Volumen wächst, gehört der Versand auf eine eigene Subdomain
(`news.neosolar.ch`) über einen spezialisierten Dienst mit eigenem SPF, DKIM
und DMARC. Geht deren Reputation kaputt, bleibt die Hauptdomain sauber.

### Rechtslage

Art. 3 Abs. 1 lit. o UWG: Massenwerbung per E-Mail braucht die vorherige
Einwilligung des Empfängers, eine korrekte Absenderangabe und einen
funktionierenden Abmeldelink. Ausnahme ist die bestehende Kundenbeziehung mit
ähnlichen Produkten. Verstösse sind auf Antrag strafbar, mit Bussen bis
100'000 Franken.

Absender und Abmeldelink sind eingebaut. Ob für die angeschriebenen Adressen
eine Einwilligung oder eine Kundenbeziehung vorliegt, entscheidet der Filter
bei der Empfängerauswahl – und damit derjenige, der die Kampagne anlegt.

---

## Aufwärmen

Eine Absenderadresse, die jahrelang zwanzig Mails am Tag verschickt hat und
plötzlich hundert an Fremde sendet, fällt auf. Empfehlung für den Start:

| Woche | Pro Tag |
|---|---|
| 1 | 20 |
| 2 | 40 |
| 3 | 70 |
| ab 4 | 100 |

Dabei die Auswertung im Auge behalten. Öffnungsraten unter 10 Prozent oder
Abmeldequoten über 1 Prozent sind Warnzeichen: Dann stimmt entweder die
Zielgruppe nicht oder der Text.

---

## Dateien

| Datei | Zweck |
|---|---|
| `client/src/features/planer/KundenPlanerPage.tsx` | Selbstplaner |
| `server/src/routes/publicCalculator.ts` | Anfrage aus dem Planer |
| `server/src/routes/publicTracking.ts` | Pixel, Klick, Abmeldung |
| `server/src/routes/admin/campaigns.ts` | Kampagnen und Versand |
| `client/src/features/admin/components/KampagnenSection.tsx` | Oberfläche |
| `netlify/functions/kampagnen.mts` | Stündlicher Versandlauf |

Tabellen: `campaigns`, `campaign_recipients`, `email_unsubscribes`,
`email_events`, `email_bounces`.
