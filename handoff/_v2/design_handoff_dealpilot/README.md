# Handoff: DealPilot – Immobilien-Deal-Analyse (iOS App)

## Overview
DealPilot ist eine native Mobile-App (iOS zuerst, Hochformat) für nebenberufliche
Immobilieninvestoren. Sie prüft Deals: extrahiert Objektdaten aus Dokumenten,
berechnet Kennzahlen (Cashflow, Renditen, Vermögenszuwachs, Steuer), findet und
verwaltet Risiken mit Quellenbeleg und beantwortet Fragen im Chat. Leitmotiv:
**Vertrauen** — jede KI-Aussage hat eine sichtbare Quelle, jede Annahme ist
editierbar.

Dieses Paket beschreibt den interaktiven Prototyp `DealPilot.dc.html` und die
begleitenden Design-Explorationen in `Pipeline.dc.html`.

## About the Design Files
Die beigelegten Dateien sind **Design-Referenzen in HTML** — Prototypen, die
Aussehen und Verhalten zeigen, **kein** Produktionscode zum 1:1-Kopieren. Aufgabe
ist, diese Designs in der Zielumgebung nachzubauen (für iOS: SwiftUI oder
React Native, je nach eurem Stack) mit euren etablierten Patterns, Komponenten
und eurem Netzwerk-/State-Layer. Falls noch keine Umgebung existiert, das für ein
natives iOS-Produkt sinnvollste Framework wählen (SwiftUI empfohlen).

Der technische Kern (`.dc.html` / `support.js`) ist ein hauseigenes Prototyping-
Format — es ist nur zum Ansehen/Nachvollziehen gedacht, nicht zu portieren. Was
zählt, sind: Layout, Interaktionen, State-Modell und vor allem die **Rechenlogik**
(unten als Formeln dokumentiert).

## Fidelity
**High-fidelity.** Finale Farben, Typografie, Abstände und Interaktionen. Die UI
sollte pixelgenau mit euren Bibliotheken nachgebaut werden. Ausnahme: alle
Bild-/Foto-Flächen und Dokument-Vorschauen sind Platzhalter.

---

## Design Tokens

### Farben
| Token | Hex | Verwendung |
|---|---|---|
| bg-app | `#f7f5f2` | App-Hintergrund (Screens) |
| bg-canvas | `#e9e6e1` | Explorations-Canvas (nur Pipeline.dc.html) |
| surface | `#ffffff` | Karten, Zeilen, Sheets |
| ink | `#23211d` | Primärtext / Headlines |
| ink-2 | `#3a3833` | Sekundärtext |
| muted | `#6b6862` | Tertiärtext |
| muted-2 | `#8a867f` | Labels |
| faint | `#9a968f` / `#b6b2ab` | Hinweise, Platzhalter |
| line | `#e7e4df` | Rahmen |
| line-soft | `#f0ede8` / `#ece9e4` | innere Trennlinien |
| chip-bg | `#f0eee9` / `#eceae6` | neutrale Chips / Segmented-BG |
| dark | `#1c1b19` | dunkle Hero-Karten, primäre Buttons, Bottom-Nav (Signal-Variante) |
| dark-line | `#33322e` | Trennlinie auf dunkel |
| **ampel-grün** | `#2e9e5b` | gut / geprüft / positiver Cashflow |
| grün-text | `#2e6f52` | grüner Text auf hell |
| grün-soft | `#e6f1ea` | grüner Badge-BG |
| grün-hell | `#7fd0a1` | grün auf dunklem BG |
| **ampel-gelb** | `#c2882a` | Hinweis / mittleres Risiko |
| gelb-soft | `#f6efdf` | gelber Badge-BG |
| **ampel-rot** | `#c1442d` | kritisch / hohes Risiko / negativer Wert |
| rot-soft | `#f6e7e3` | roter Badge-BG |
| rot-hell | `#e08a7a` | rot auf dunklem BG |
| **teal (Plan/KI)** | `#4a7a86` | Maßnahmen, Kontext, KI-Aktionen, Affiliate |
| teal-text | `#2f5760` | teal Text |
| teal-soft | `#e6eef0` | teal Badge-BG |
| teal-hell | `#8fc3d0` / `#8fb0a3` | teal auf dunkel / Balken |
| grau-inaktiv | `#cfccc6` / `#dcd8d1` | fehlend / inaktiv |

**Statussemantik durchgängig:** Grün = gut/ok, Gelb = Hinweis/mittel,
Rot = kritisch/hoch, Grau = fehlend/inaktiv. Teal ist bewusst KEINE Ampelfarbe —
es markiert „Plan / bewusste Handlung / KI" (Maßnahmen, Kontext, Finanzierung,
Gutachter).

### Typografie
Drei Familien (Google Fonts):
- **Bricolage Grotesque** (700) — Headlines, Screen-/Sheet-Titel, Score-Zahl,
  Deal-Titel, große Kennzahl-Überschriften.
- **Hanken Grotesk** (400/500/600/700) — gesamte UI, Fließtext, Labels, Buttons.
- **IBM Plex Mono** (400/500/600) — alle Zahlen/Beträge, Kürzel, Uppercase-
  Mono-Labels (z. B. `SCORE`, `KI-URTEIL`, `CASHFLOW / MONAT`).

Grundregel: **Zahlen und technische Labels immer in IBM Plex Mono**, Text in
Hanken, große Titel in Bricolage.

Typische Größen: Screen-Titel 18–21px/700 Bricolage; Kartentitel 13–14px/600
Hanken; Body 12.5–13.5px/400–500 Hanken; Mono-Labels 9–10.5px/600 mit
letter-spacing .06–.14em, UPPERCASE; große Kennzahl 30–32px/600 Mono;
Score-Zahl 19–22px/700 Bricolage.

### Radius / Schatten / Spacing
- Radius: Karten 14–18px, Zeilen/Chips 10–13px, Sheets 24px oben, Score-Feld 12–14px,
  Avatare 50%, Buttons 12–14px.
- Sheet-Schatten: `0 -10px 40px -10px rgba(0,0,0,.3)`.
- Karten-Schatten (Signal-Variante): `0 1px 3px rgba(0,0,0,.05)`.
- Spacing-Raster: 8 / 10 / 12 / 14 / 16px; Screen-Padding 16px.

### Icons
Dünne Linien-SVGs, stroke-width 1.6–2.0, `currentColor`/Token-Farbe. In der
Zielumgebung durch euer Icon-Set ersetzen (SF Symbols o. ä.). Keine Emoji.

---

## Geräte-Rahmen
Prototyp rendert in einem iPhone-Rahmen: Screen 392×840px Inhalt, Radius 43px,
Dynamic Island oben zentriert (116×33px), Statusbar 9:41 links. Der Rahmen ist
nur Prototyp-Deko — in der echten App entfällt er.

---

## Navigation / Screen-Map
```
Pipeline (Home)                      ← Startseite, Liste aller Deals
  └ Deal antippen → Deal-Detail
Deal-Detail (fixer Kopf + 4 Tabs)
  ├ Übersicht   (KI-Urteil, Ansprechpartner, Score-Zerlegung, Risiken, To-dos)
  ├ Kalkulation (Szenario, Cashflow-Hero, Kennzahlen, Mietfahrplan, Annahmen-Sheet)
  ├ Dokumente   (DD-Fortschritt, Doku-Listen, Upload-Flow, Doku-Viewer)
  └ Chat        (Multi-Chat mit Verlauf, Quellen)
  └ Top-Risiko / Risikozeile → Risiko-Detail (Lebenszyklus + Wizard)
Bottom-Nav: Pipeline · Markt (angedeutet) · + Neuer Deal · Profil (angedeutet)
Overlays/Sheets: Deal anlegen · Objektdaten · Annahmen · Maßnahme · Risiko-Wizard
  · Dokumenten-Flow · Doku-Viewer · Status · Kontextmenü · Zusammenarbeiten
  · Ansprechpartner · Chat-Verlauf · Berechnungen · Pipeline-Aktionsmenü
```

---

## Screens / Views

### 1. Pipeline (Home)
- **Zweck:** Übersicht aller Deals, gruppiert nach Status, sortiert nach Score.
- **Layout:** Weißer Header (Titel „Pipeline" in Bricolage 21/700 + ⋮-Aktionsmenü
  rechts). Darunter Suchleiste (chip-bg, Lupe-Icon, Freitext filtert Ort/Straße/Typ).
  Scroll-Liste mit Status-Sektionen: **In Prüfung · Neu · Verhandlung · Verworfen**,
  je mit Mono-Zähler. Bottom-Nav (4 Punkte, + zentral betont).
- **Deal-Zeile (Terminal-Stil, kein Card-Look):** links 4px Farb-Rail (Ampel nach
  Score), dann getönte Score-Spalte (54px breit: Score-Zahl Mono + `SCORE`),
  dann Inhalt: Titel `{Art} · {Straße}`, Untertitel `Ort · m² · Baujahr · Status`
  (Mono), KPI-Zeile `Kaufpreis · Rendite · ⚠ N Risiken`. Geteilte Deals zeigen
  rechts oben gestapelte Kollaborator-Avatare (Initialen, -6px overlap).
- **Verworfen:** reduziert (opacity .62), grauer Rail, „—" statt Score.
- **Interaktion:** Zeile tippt → Deal-Detail. ⋮ → Aktionsmenü-Sheet (Neuer Deal +
  Sortierung Score/Kaufpreis/Datum mit aktivem Haken).

### 2. Deal-Detail – fixer Kopf
- Immer sichtbar über allen Tabs. Zurück-Pfeil-Zeile + ⋮ rechts. Darunter:
  Score-Feld links (54px, getönt nach Score-Farbe, Zahl in Bricolage + `SCORE`),
  Deal-Titel (Straße, Bricolage 18/700), Meta (`Art · Ort · m²`, Mono), Preis.
- Tab-Leiste: Übersicht · Kalkulation · Dokumente · Chat (aktiv = ink-Text +
  2px Unterstrich ink; inaktiv = faint).
- Score/Farbe sind abgeleitet (siehe Rechenlogik → Score).

### 2a. Tab Übersicht
- **Kollaborations-Leiste** (falls geteilt): Avatare + „Geteilt mit … · Verwalten"
  → Zusammenarbeiten-Sheet.
- **KI-Urteil** (dunkle Karte `#1c1b19`): Label `KI-URTEIL` (grün Punkt), 2–3 Sätze
  Klartext in hell, Trennlinie, `EMPF. MAX-PREIS` + grüner Chip mit Betrag.
- **Ansprechpartner-Karte:** Avatar (Initialen), Name + Rolle, Schnellzugriff
  Anrufen (grün) / E-Mail (teal) direkt; Tippen → Ansprechpartner-Sheet
  (Anrufen · E-Mail · Foto hinzufügen · Anpassen).
- **Score-Zerlegung:** 4 horizontale Balken (Rendite / Lage & Markt / Objekt & WEG /
  Doku-Risiken) mit Wert rechts, Farbe nach Höhe; Ø-Score oben rechts.
- **Risiken (gruppiert, dicht):** Sektionen `OFFEN · SCHWEBEND` (Punkt mit
  ring-shadow) und `ERLEDIGT`. Jede Zeile: Kürzel (KRIT/HINW/AKZ./ÜBERN/FRAGE),
  Titel, Betrag (offen = grau `~Betrag`, übernommen = rot, akzeptiert = grün 0 €),
  Chevron. Zeile → Risiko-Detail. Kopf zeigt „einkalkuliert −X €".
- **Nächste Schritte:** Checkliste, teils mit `KI-MAIL`-Chip.

### 2b. Tab Kalkulation (rechenintensiv)
- **Szenario-Segmented:** Base / Bull / Bear (Miet-Faktor 1.0 / 1.08 / 0.92).
- **Cashflow-Hero** (dunkle Karte): Label `CASHFLOW / MONAT · {Szenario}` + Info-
  Button (öffnet Berechnungen-Sheet). Große Zahl = Cashflow (Ampelfarbe), daneben
  klein „±X € n. Steuern". Zwei Sub-Stats mit Trennlinie:
  **Vermögenszuwachs** (tippbar → Berechnungen-Sheet) und **Bruttomietrendite**.
- **Kennzahl-Grid (2×2):** EK-Rendite 10 J., Kaufpreisfaktor, GIK (Gesamtinvest.),
  Bankrate.
- **Annahmen-Kurzliste** (tippbar → Annahmen-Sheet): Kaufpreis, Sollzins,
  Anf. Tilgung, Eigenkapital, Übernommene Risiken (Betrag/„keine").
- **Mietentwicklung:** Umschalter Automatik/Pro Jahr. Balkengrafik 10 Jahre
  (teal = Jahr mit Maßnahme, hellgrün = Jahre nach Maßnahme, grau davor).
  Pro-Jahr-Liste: Jahr, Miete (editierbares Pill), `ANGEPASST`-Marker, Cashflow/Mo,
  Maßnahme-Marker (teal, Titel · +€/Mo · −Investition). „Maßnahme hinzufügen" →
  Maßnahme-Sheet. Jahre 5–10 ein-/ausklappbar.
- **Kaufnebenkosten (automatisch):** Grunderwerbsteuer (bundeslandabhängig, hier
  Sachsen 5,5 %), Notar & Grundbuch (1,6 %), Makler (editierbar, Standard 3,57 %),
  übernommene Risiken (rot markiert, falls vorhanden).

### 2c. Tab Dokumente
- **DD-Fortschritt** (dunkle Karte): „DD-Checkliste 7/11" + Balken + Note.
- **Mit Befund:** dichte Zeilen (Ampel-Punkt, Name, Note, Badge Risiko/Hinweis/OK,
  Chevron) → Doku-Viewer.
- **Geprüft · unauffällig:** standardmäßig eingeklappt, „N unauffällige einblenden".
- **Fehlt noch:** gestrichelte Zeilen mit „Anfordern" (generiert KI-Mail, Toast,
  Zeile verschwindet).
- **Zwei große Buttons:** „Fotos hochladen" (teal, KI findet Mängel → fügt
  Foto-Befund ein) und „Dokument" (→ Dokumenten-Upload-Flow).

### 2d. Tab Chat (Multi-Chat)
- **Kopf-Leiste:** aktueller Chat-Titel + verknüpftes Thema-Chip (z. B.
  „Risiko · Marodes Dach"), Verlaufs-Icon (→ Chat-Verlauf-Sheet), „Neu".
- **Verlauf:** KI-Bubbles (weiß, mit `KI`-Avatar) + Quell-Chip darunter (Pflicht,
  z. B. „ETV-Protokoll 2025 · S.3" / „Kalkulation · Base"); User-Bubbles dunkel
  rechts. Tipp-Indikator „•••".
- **Vorschlags-Chips** über der fixierten Eingabe; Senden-Button dunkel rund.
- **Chat-Verlauf-Sheet:** Liste aller Chats (Titel, verknüpftes Thema, Nachr.-Zahl),
  aktiver umrandet; „Neuer Chat" startet leer (Token-Ersparnis), Titel wird aus
  erster Frage abgeleitet.

### 3. Risiko-Detail (Lebenszyklus)
- **Status-Badge** je Zustand: OFFEN·SCHWEBEND (grau, roter Punkt) / IN KOSTEN
  ÜBERNOMMEN (rot) / AKZEPTIERT·KOSTEN ENTFALLEN (grün) / FRAGE AN VERKÄUFER OFFEN
  (grau). Erledigte Zustände zeigen ein Schloss-Icon (readonly).
- Titel + Beschreibung. **Fundstelle:** wörtliches Zitat (kursiv) + Quelle mit
  farbigem Rand — Beweis, dass die KI nicht halluziniert.
- **Effekt-Zeile:** offen = gestrichelt „KI-Schätzung · zählt noch nicht" (`~Betrag`);
  erledigt = „Wirkung auf Kalkulation" (Betrag/0 €).
- **Offen:** bei großen Risiken teal-Karte „Bausachverständigen dazuholen · Kontakt
  stellen wir" (Affiliate). CTA **„Risiko jetzt bewerten"** → Wizard.
- **Erledigt:** ggf. Gutachter-Karte + Kontext-Zitat; Buttons **Aktualisieren**
  (öffnet Wizard) und **Neu eröffnen** (Status→offen).
- **Wizard (Sheet), 2 Stufen:**
  - *choose:* In Kosten übernehmen (Kosten = estimate) · Akzeptieren, Kosten
    entfallen (0 €) · Kontext geben (→ Sub-Dialog) · Fragen an Verkäufer.
  - *context:* Mini-Chat — Info eingeben → „arbeitet…" → KI-Rückfrage; bei
    entlastendem Kontext (Gutachten/„Verkäufer übernimmt"/„trocken" …) Vorschlag
    („Kosten entfallen" bzw. „Kosten reduziert") mit Button „Risiko so anpassen".

### 4. Deal anlegen (Overlay)
- Erreichbar über + (Header-Aktionsmenü und Bottom-Nav).
- Oben optional „Unterlagen hochladen / Portal-Link" (→ Dokumenten-Flow).
- **Manuell zuerst:** Objektart-Segmented (ETW/MFH/Haus), **Adresse optional**
  (Straße, PLZ, Ort — „falls bekannt"), **Status-Segmented „Aktuell vermietet /
  Nicht vermietet"** (Pflicht), Kaufpreis, Wohnfläche, optional Kaltmiete.
  Primär-Button „Deal anlegen".

### 5. Dokumenten-Upload-Flow (Overlay, 4 Schritte)
1. **Hinzufügen:** Drop-Fläche + Liste hinzugefügter Dateien (mit ×), optionales
   Kontext-Feld. KI analysiert grundsätzlich alle (kein Anhaken). „Analysieren".
2. **KI verarbeitet:** generische Animation (rotierender Ring + pulsierendes
   Dokument-Icon, dunkle Fläche), ruhige Statuszeile, KEIN Fortschrittsprozent.
   (Bewusst generisch — nicht spezifische Schritte behaupten.)
3. **Rückfrage:** KI fragt gezielt (z. B. welches Hausgeld nicht umlegbar) mit
   Schnellantworten (+ Seitenbeleg) + Freitext; überspringbar.
4. **Ergebnis:** Zusammenfassung + überschreibbare Kategorie-Chips (▾), aus einer
   Datei aufgeteilte Dokumente (z. B. 3 ETV-Jahrgänge), Foto-Hinweis;
   „Falsch erkannt? Mit Hinweisen neu analysieren" (→ zurück zu Schritt 2),
   „Übernehmen".

### 6. Dokument-Viewer (Overlay)
KI-Zusammenfassung (dunkle Karte), bei Befund-Dokumenten zitierte Fundstelle +
Quelle, Dokument-Vorschau (Platzhalter-Zeilen), Buttons „Zum Dokument fragen"
(→ Chat) und „Fertig".

### 7. Weitere Sheets
- **Objektdaten bearbeiten:** Art, Straße, Ort, m², Baujahr, Kaufpreis, Kaltmiete,
  Makler-Provision % (+ „provisionsfrei"-Toggle).
- **Status ändern:** Neu · In Prüfung · Verhandlung · Gekauft · Verworfen
  (Ampel-Punkt, aktiver Haken).
- **Kontextmenü (⋮):** Status ändern · Stammdaten bearbeiten · Zusammenarbeiten ·
  Deal teilen (digitales Exposé, Stub) · Löschen.
- **Zusammenarbeiten:** Einladen per E-Mail + Rolle (Bearbeiten/Nur ansehen),
  Link kopieren, Liste „Mit Zugriff" (Rolle, Eingeladen-Status, Entfernen).

---

## Rechenlogik (KERN — 1:1 implementieren & testen)

Alle Beträge intern in € (float), gerundet erst zur Anzeige. Monatswerte wo
angegeben. Prozent als Dezimal (z. B. 3,8 % → 3.8).

### Eingaben (State)
- `preis` = Kaufpreis des aktiven Szenarios (`priceByCase[base|bull|bear]`,
  je Case separat editierbar, min 80 % des Angebots per Rabatt-Regler)
- `rentBase` = Kaltmiete/Monat (`deal.rent`)
- `zins` (Sollzins % p.a.), `tilg` (anf. Tilgung % p.a.), `ek` (Eigenkapital €,
  frei 0…GIK), `maklerPct` (z. B. 0.0357)
- `costs` = { hausgeld, ruecklage, verwaltung } (nicht umlegbar, €/Monat),
  `costGrowth` (% p.a.), `wertZuwachs` (% p.a.), `steig` (Mietsteigerung % p.a.)
- `gebaeudewert` (€, ohne Grund), `afaSatz` (%), `steuersatz` (Grenzsteuersatz %)
- `measures[]` = { year, invest €, uplift €/Monat }
- `risks[]` mit `status` und `appliedCost`

### Formeln
```
faktorSzenario = base 1.0 | bull 1.08 | bear 0.92
rent          = rentBase * faktorSzenario                 // Kaltmiete/Monat
grunderwerb   = preis * 0.055        // bundeslandabhängig (Sachsen 5,5 %)
notar         = preis * 0.016
makler        = preis * maklerPct
NK            = grunderwerb + notar + makler               // Kaufnebenkosten
riskCost      = Σ appliedCost aller risks mit status = 'covered'
GIK           = preis + NK + riskCost                      // Gesamtinvestitionskosten
ek            = min(eingegebenesEK, GIK)                    // gedeckelt
loan          = max(0, GIK - ek)                            // Darlehen
zinsMonat     = loan * (zins/100) / 12
tilgMonat     = loan * (tilg/100) / 12
bankrate      = zinsMonat + tilgMonat                       // = Annuität/Monat
nkMonat       = hausgeld + ruecklage + verwaltung           // nicht umlegbar
cashflow      = rent - bankrate - nkMonat                   // vor Steuern, /Monat
wertzuwachsM  = preis * (wertZuwachs/100) / 12
afaJahr       = gebaeudewert * (afaSatz/100)                // nur Gebäude!
steuerbasisJ  = rent*12 - nkMonat*12 - zinsMonat*12 - afaJahr
steuerJahr    = steuerbasisJ * (steuersatz/100)             // negativ = Ersparnis
steuerMonat   = -steuerJahr / 12                            // + = Vorteil
cashflowNSt   = cashflow + steuerMonat                      // nach Steuern /Monat
vermoegenzuwachs = cashflow + tilgMonat + wertzuwachsM + steuerMonat   // /Monat
brutto        = (rent*12) / preis * 100                     // Bruttomietrendite %
netto         = (rent*12 - nkMonat*12) / GIK * 100          // Netto-Mietrendite %
faktor        = preis / (rent*12)                           // Kaufpreisfaktor
ekRendite     = ek>0 ? ((cashflow*12) + tilgMonat*12 + preis*0.02) / ek * 100 : 0
```

### AfA-Hintergrund (recherchiert, für korrekte Defaults/Validierung)
- Nur das **Gebäude** ist abschreibbar, nicht Grund & Boden → `gebaeudewert`
  als eigenen Wert erfassen (Kaufpreisaufteilung).
- Lineare AfA-Sätze: **2,0 %** (Baujahr ab 1925), **2,5 %** (vor 1925),
  **3,0 %** (Fertigstellung ab 2023). Degressive/Sonder-AfA existieren (5 %
  Neubau 10/2023–09/2029) — im Prototyp nicht abgebildet, ggf. später.
- Steuervorteil = AfA & Verluste × Grenzsteuersatz. Grenzsteuersatz frei
  einstellbar (Presets: GmbH ~15,8 % · 30 % · 42 % · 45 %).

### Mietfahrplan pro Jahr (Balken & Cashflow je Jahr)
```
g = 1 + steig/100
für Jahr y = 1..10:
  miete_y = rentBase * g^(y-1) + Σ uplift aller Maßnahmen mit year ≤ y
  cashflow_y = miete_y - bankrate - nkMonat * (1+costGrowth/100)^(y-1) - risikoMonat
```
Maßnahme: einmalige `invest` im Jahr `year`, danach dauerhaft `uplift` €/Monat.

### Score (Prototyp-Heuristik — durch echtes Modell ersetzen)
```
resolvedN   = Anzahl risks mit status ≠ 'open'
totalCovered= Σ appliedCost (covered)
scoreVal    = clamp(round(74 + resolvedN*2 - totalCovered/1500), 40, 95)
dokuVal     = clamp(41 + resolvedN*8, 0, 95)
maxPreis    = round((180600 - totalCovered)/100)*100
Farbe: ≥70 grün · ≥50 gelb · sonst rot
```

---

## Risiko-Lebenszyklus (State-Machine)
```
open ──[Wizard: In Kosten übernehmen]──▶ covered   (appliedCost = estimate)
open ──[Wizard: Akzeptieren]───────────▶ accepted  (appliedCost = 0)
open ──[Wizard: Fragen an Verkäufer]───▶ question   (appliedCost = 0)
open ──[Kontext-Dialog: Vorschlag]─────▶ covered|accepted (+ context, ggf. surveyor)
covered|accepted|question ──[Neu eröffnen]──▶ open
covered|accepted|question ──[Aktualisieren]──▶ Wizard erneut
```
Nur `covered` fließt mit `appliedCost` in `riskCost`/GIK. „open" kostet nichts
(erscheint nur als grauer Schätzwert). Score/Max-Preis reagieren monoton.

## State Management (Überblick)
Ein zentrales Deal-Objekt hält: Objektdaten (`deal`), `priceByCase`, Finanzierungs-
Annahmen (`zins`, `tilg`, `ek`), `costs`+`costGrowth`, `wertZuwachs`,
`gebaeudewert`+`afaSatz`+`steuersatz`, `measures[]`, `risks[]` (mit Status),
`chats[]`+`activeChatId`, `collaborators[]`, `dealStatus`, `contact`.
Alle Kennzahlen sind **abgeleitet** (reine Funktion des State) → als
berechnete Properties / Selektoren implementieren, damit alles live neu rechnet.
UI-Flags (`*Open`, `*Step`) steuern Sheets/Overlays.

## Interactions & Behavior
- Segmented Controls (Szenario, Objektart, Status, Rolle): aktives Segment weiß
  mit weichem Schatten, Rest transparent/faint.
- Sheets: von unten (`translateY(100%)→0`, ~.28s cubic-bezier(.2,.8,.2,1)),
  Backdrop `rgba(20,19,17,.4)` fade-in. Vollbild-Overlays (Deal anlegen, Doku-Flow,
  Doku-Viewer): fade-in .2s.
- Toast: unten zentriert, dunkel, grüner Haken, ~2,2 s, slide-up.
- Slider (Zins/Tilgung/Wertzuwachs/Kostensteigerung): Track als Gradient
  (gefüllt ink/teal bis Wert, Rest `#e6e3de`), runder Thumb weiß mit Rand.
- Live-Recalc: jede Annahmen-Änderung aktualisiert Cashflow, alle Kennzahlen,
  Mietfahrplan, Score, Max-Preis sofort.
- Dokumenten-Flow-Schritt 2 → 3 automatisch nach ~2,1 s (Prototyp).

## Assets
Keine echten Bilder — alle Foto-/Dokument-Flächen sind Platzhalter (getönte
Flächen bzw. Balken). Icons sind inline-SVG-Platzhalter → durch euer Icon-Set
ersetzen. Fonts: Bricolage Grotesque, Hanken Grotesk, IBM Plex Mono (Google Fonts).

## Files
- `DealPilot.dc.html` — der interaktive Prototyp (alle Screens, Sheets, Rechenlogik).
  Die Logik-Klasse (`class Component`) enthält `calc()` und `renderVals()` — die
  maßgebliche Referenz für Formeln und abgeleitete Werte.
- `Pipeline.dc.html` — Design-Explorationen (Optionen-Canvas): Score-Badge-Varianten,
  Header-Varianten, Font-Studien (Runde 11 = gewählte Richtung „11d"), Risiko-Tabelle,
  Kalkulations-Layouts, Dokumenten-Flow-Storyboard, Deal-anlegen-Optionen.
- `support.js` — Laufzeit des Prototyp-Formats (nur zum Rendern/Ansehen, nicht
  portieren).
- `screens/` — Screenshots der Kern-Screens.

Zum Ansehen: die `.html`-Dateien in einem Browser öffnen (benötigen `support.js`
im selben Ordner).
