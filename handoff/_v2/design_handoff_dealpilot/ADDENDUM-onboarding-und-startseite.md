# Addendum zum Handoff — Onboarding & neue Startseite

Ergänzung zum ursprünglichen `README.md`. Fasst **alle Änderungen seit dem
ersten Handoff** zusammen. Der aktualisierte Prototyp liegt als
`DealPilot.dc.html` (in diesem Ordner überschrieben) bei.

Kurz: **(1)** kompletter Onboarding-/Auth-Flow ist neu, **(2)** die Startseite
(Pipeline) wurde neu gestaltet, **(3)** die Bottom-Nav ist raus.

---

## 1 · Onboarding- & Auth-Flow (neu)

Die App **startet jetzt im Onboarding**, nicht mehr direkt in der Pipeline.

### Screen-Reihenfolge (State-Machine)

`state.screen` steuert den Flow:

```
welcome ─(Loslegen)──────────▶ auth (authMode:'register')
        └(Ich habe ein Konto)▶ auth (authMode:'login')

auth  ─Login  (anmelden / Apple / Google)─────────────────▶ pipeline
      └Register(konto erstellen / Apple / Google)──────────▶ profile ▶ disclaimer ▶ pipeline
```

Zusätzliche Flags:
- `authMode`: `'login' | 'register'` — Segment-Umschalter im Auth-Sheet.
- `agbAccepted`: bool — Pflicht-Checkbox, **nur** bei Register.
- `understood`: bool — Pflicht-Checkbox im KI-Hinweis.

Regel: Bei **Login** geht es direkt in die Pipeline. Bei **Register** kommen
Profil und KI-Hinweis dazwischen (auch bei Apple/Google-Register).

### 1.1 Welcome
- Hintergrund `#e9e4db` mit radialem Verlauf; drei echte Deal-Karten „driften"
  langsam (Keyframe `cdrift`, 7–8,6 s, `translateY` + minimale Rotation).
- Unten ein **Bottom-Sheet** (`#fff`, radius `32px 32px 0 0`), das beim Erscheinen
  hochfährt (Keyframe `sheetup`, `.7s cubic-bezier(.2,.7,.2,1)`).
- Logo-Lockup + Headline „Vom Exposé zur Entscheidung." (Bricolage 800, 29px).
- Primär: **Loslegen** (dunkel `#23211d`) → Register. Sekundär: **Ich habe schon
  ein Konto** → Login.

### 1.2 Auth (Login / Register, ein Sheet)
- Hintergrund = unscharfe Pipeline (Deal-Karten `blur(10px)`, opacity ~.62) plus
  heller Verlaufs-Overlay. Zurück-Pfeil oben links → Welcome.
- **Segment-Umschalter** „Anmelden / Registrieren" (aktiv: weiße Pille mit
  Schatten; inaktiv: grau).
- Felder: Register zeigt zusätzlich **Name** oben. Danach **E-Mail**, **Passwort**.
- **Aktive AGB-Zustimmung (nur Register):** Checkbox „Ich akzeptiere die AGB und
  die Datenschutzerklärung." — CTA und Social-Buttons sind **gesperrt/gedämpft
  (`#bdbab3`)**, bis angehakt. Klick im gesperrten Zustand → Toast „Bitte AGB &
  Datenschutz akzeptieren".
- CTA-Text: `authMode==='login' ? 'Anmelden' : 'Konto erstellen'`.
- **Schnell-Login:** Apple- und Google-Button **in beiden Modi**, mit echten
  Markenlogos (Apple-Glyph in Textfarbe; Google 4-farbiges „G"). Gleiche
  AGB-Sperre wie der CTA bei Register.

### 1.3 Profil (nur Register)
- „Schritt 2 von 2 · Profil", Headline „Wie heißt du?".
- Avatar-Platzhalter mit Kamera-Badge (Foto optional, kein Pflichtfeld).
- Nur zwei Felder: **Vorname**, **Nachname**. CTA **Weiter** → KI-Hinweis.
- Reicht bewusst Name/Vorname — mehr wird nicht abgefragt.

### 1.4 KI-Hinweis (nur Register)
Aufklärung über KI-Grenzen + Haftungsausschluss, „schick verpackt". **Finaler
Wortlaut kommt mit den AGB — Text hier ist Platzhalter.**
- „So arbeiten wir", Headline „KI & Mensch — drei Grundsätze".
- Drei nummerierte Grundsätze: **01** Die KI analysiert · **02** Fehler sind
  möglich · **03** Du prüfst & entscheidest.
- Fußnote: „Keine Rechts-, Steuer- oder Anlageberatung. Keine Gewähr für
  Richtigkeit oder Vollständigkeit."
- **Pflicht-Checkbox** „Verstanden & akzeptiert" — CTA **Weiter** gesperrt/gedämpft
  bis angehakt (sonst Toast). Danach → Pipeline.

---

## 2 · Startseite / Pipeline (neu gestaltet)

Ersetzt den alten schlichten Kopf (Titel „Pipeline" + Suchleiste + dichte Liste).
Richtung intern „4b".

### 2.1 Kopfbereich (nicht scrollend, Papier-BG `#f4efe6`)
- **Begrüßung**: „Guten Morgen" (klein, grau) + Vorname (Bricolage 800, 22px).
  Rechts: **⋯-Menü** (Sortierung, unverändert) + **Avatar** (Initialen).
- **Avatar** ist tippbar → Profil (aktuell Toast-Platzhalter; Profil-Screen im
  App-Bereich noch offen).
- **Gesamtwert-Karte** (weiß, radius 18):
  - Label `GESAMTWERT` + Pille `3 DEALS`.
  - Große Zahl **746.000 €** (`white-space:nowrap`).
  - Unterzeile „Summe der Kaufpreise deiner Deals in Prüfung".
- **Zwei Kacheln**:
  - **Cashflow/M · Base Case** `+1.210 €` (grün) — Cashflow bezieht sich auf den
    **Base Case** (nicht Bull/Bear).
  - **offene Risiken** `3` (amber).
- **Suchleiste** bleibt erhalten (weiße Pille, `query`/`onQuery` unverändert).

> Kennzahlen im Prototyp statisch (Portfolio-Ebene). In der App aus den Deals
> aggregieren: Gesamtwert = Σ Kaufpreise; Cashflow = Σ Base-Case-Cashflow/Monat;
> Risiken = Σ offene Risiken.

### 2.2 Liste (scrollt, weißes Panel `radius 22 22 0 0`)
Gleiche Gruppierung wie vorher (**IN PRÜFUNG / NEU / VERHANDLUNG / VERWORFEN**),
aber neue Zeilen-Darstellung:
- Abschnittskopf: Mono-Label + Count in `#c9c4bb`.
- Zeile: **abgerundete Score-Kachel 44×44** (`d.softBg` Hintergrund, `d.color`
  Zahl) statt Farbbalken + Score-Spalte; Titel `Typ · Straße`; **eine** Mono-Zeile
  `Preis · Rendite · Risiko` (Risiko in `d.color`). Geteilte Deals: Avatar-Stack
  rechts.
- **VERWORFEN**: gleiche Zeilenstruktur, gedämpft (`opacity .62`), Kachel grau
  `#eee9e1` mit „—". Nur sichtbar wenn nicht gesucht wird (`notSearching`).
- Die frühere Zusatzzeile mit Ort/Fläche/Baujahr (`d.sub`) wurde in der Liste
  entfernt (bleibt im Deal-Detail). Bei Bedarf leicht wieder aufnehmbar.

### 2.3 Navigation
- **Bottom-Tab-Bar entfernt.** „Markt" kommt vorerst nicht; „Profil" läuft über
  den Avatar oben rechts.
- **Floating-Action-Button** unten rechts (grün `#2e6f52`, 54×54, `+`) →
  Deal anlegen (`toastPlus` / vorhandener Create-Flow). Liste hat 90px
  Bodenabstand, damit die letzte Zeile frei bleibt.

---

## 3 · Was sonst noch gilt
- Deal-Detail, Kalkulation, Risiko-Flow, Chat, Dokumente: **unverändert** ggü.
  ursprünglichem Handoff.
- Neue Keyframes im Prototyp: `sheetup`, `cdrift`, `fu`, `fin` (nur Onboarding &
  Startseite).
- Farbtokens unverändert; ergänzend genutzt: Papier `#f4efe6`, Sheet-Grau
  `#e9e4db`, Kachel-Grün `#e6f1ea`/`#2e9e5b`.

## Offene Punkte (nicht in diesem Update)
- In-App-Profil-Screen (Avatar-Ziel).
- Markt-Tab.
- Finaler Rechtstext für den KI-Hinweis (mit AGB).
