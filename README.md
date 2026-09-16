# Ganz schön clever · Punkteblock

Ein interaktiver Wertungsblock für das Würfelspiel **Ganz schön clever**
(Wolfgang Warsch, Schmidt Spiele). Die Seite ersetzt den Papierblock beim
Auswerten: Kreuze werden angeklickt, die Punkte laufen automatisch mit und
freigeschaltete Boni landen in einer Liste, die man abarbeiten kann.

Gewürfelt wird weiterhin am Tisch – die App kennt keine Würfel und prüft
keine Würfelergebnisse. Sie kümmert sich nur um Block, Punkte und Boni.

## Was die Seite kann

- **Vollständiger Block** in allen fünf Farben, inklusive vorgekreuzter
  gelber Diagonale, blauer Punkteleiste und der ×2/×3-Felder in Orange.
- **Automatische Wertung**: gelbe Spalten (10/14/16/20), blaue Punktetabelle
  nach Anzahl der Kreuze, grüne Dreieckszahlen, orange mit Multiplikatoren,
  lila als Summe – plus Füchse × schwächster Farbbereich.
- **Farbboni werden sofort verarbeitet**, so wie am Tisch auch:
  - *Zahlenboni* (orange 4/5/6, lila 6) landen direkt im nächsten freien Feld
    der Reihe. Ein Toast sagt, was wohin geschrieben wurde.
  - *Grünes Kreuz* rückt die grüne Reihe ein Feld weiter – dort gibt es
    ohnehin nur ein legales Ziel.
  - *Gelbes und blaues Kreuz* sind frei wählbar und werden deshalb als
    Zwangsauswahl gestellt: Der Block ist gesperrt, nur der geforderte
    Bereich reagiert, und erst das gesetzte Kreuz gibt ihn wieder frei.
    Wer sich verklickt hat, lässt den Bonus über den Banner verfallen.
  - Ketten lösen sich von selbst auf: Schreibt ein Bonus in ein Feld, das
    seinerseits einen Bonus trägt, wird auch der sofort abgearbeitet.
- **Vorrat und Füchse**: Wiederholungswürfe und +1 bleiben als Liste stehen,
  bis man sie einlöst. Füchse zählen automatisch mit.
- **Rundenleiste** mit den Rundenboni 1–4; die Rundenzahl richtet sich nach
  der Spielerzahl (1–2 Spieler: 6 Runden, 3 Spieler: 5, 4 Spieler: 4).
- **Mehrere Spieler** mit eigenem Block, umbenennbar, Punktestand in der
  Spielerleiste.
- **Gesetzt ist gesetzt**: Ein Kreuz oder eine Zahl lässt sich nicht einzeln
  zurücknehmen – wie auf Papier. Korrigiert wird über den **Verlauf**: Er
  führt die letzten 30 Züge aller Spieler gemeinsam und nimmt auf Klick den
  gewählten Zug samt allem danach zurück, inklusive der Boni, die dabei
  ausgelöst wurden. Strg+Z (bzw. Cmd+Z) nimmt den letzten Zug zurück.
- **Spielstand bleibt erhalten** (localStorage), auch nach dem Neuladen.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm test         # Wertungslogik testen
npm run build    # Produktionsbuild nach dist/
```

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `src/game/layout.ts` | Der Block als Daten: Raster, Bonusfelder, Multiplikatoren, Punktetabellen, Runden |
| `src/game/scoring.ts` | Wertung und Ermittlung der freigeschalteten Boni |
| `src/game/state.ts` | Reducer für Spielzustand plus Speichern im Browser |
| `src/components/` | Darstellung der Bereiche, Bonus- und Punktepanel |

Der komplette Blockaufbau steht in `src/game/layout.ts`. Wer eine Variante
(z. B. einen anderen Wertungsblock) abbilden möchte, ändert nur diese Datei –
Wertung und Bonuslogik lesen alles von dort.

### Boni auf dem Block

| Bereich | Bonus |
| --- | --- |
| Gelb, Reihen 1–4 | blaues Kreuz · orange 4 · grünes Kreuz · Fuchs |
| Gelb, Diagonale 3–1–2–6 | +1 |
| Gelb, Spalten 1–4 | 10 · 14 · 16 · 20 Punkte |
| Blau, Reihen 1–3 | orange 5 · gelbes Kreuz · Fuchs |
| Blau, Spalten 1–4 | Wiederholungswurf · grünes Kreuz · lila 6 · +1 |
| Grün, Felder 4/6/7/9/10 | +1 · blaues Kreuz · Fuchs · lila 6 · Wiederholungswurf |
| Orange, Felder 3/5/6/8/10 | Wiederholungswurf · gelbes Kreuz · +1 · Fuchs · lila 6 |
| Lila, Felder 3–11 | Wiederholungswurf · blaues Kreuz · +1 · gelbes Kreuz · Fuchs · Wiederholungswurf · grünes Kreuz · orange 6 · +1 |
| Runden 1–4 | Wiederholungswurf · +1 · Wiederholungswurf · beliebiges Kreuz oder eine 6 |

## Veröffentlichen

`.github/workflows/deploy.yml` baut die Seite und veröffentlicht sie auf
GitHub Pages, sobald auf `main` gepusht wird. Dafür in den Repository-
Einstellungen unter *Pages* als Quelle **GitHub Actions** auswählen.

Die Seite liegt dann unter `https://<nutzer>.github.io/Ganz-schoen-clever/`.
Beim Hosten in einem anderen Verzeichnis `base` in `vite.config.ts` anpassen.

---

*Ganz schön clever* ist ein Spiel von Wolfgang Warsch, erschienen bei
Schmidt Spiele. Dieses Projekt ist eine inoffizielle Auswertungshilfe und
enthält weder Regeltext noch Grafiken des Spiels.
