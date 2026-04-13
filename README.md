# PixelFocus

> A gamified Pomodoro todo list Chrome extension — earn textiles by staying focused, weave them into pixel art, and stack money for a sprawling factory empire. Terry Gilliam office dystopia, Stanley Parable narrator voice, seventy-four sealed title ranks, and a pop-out timer that survives background-tab throttling.

**Current version:** `v3.19.17`

---

## What it is

PixelFocus is a single-user productivity tracker built around 10-minute focus sessions. Every completed session rewards you with a textile (the in-game resource), XP toward your next rank, and — once you hit Tier 3 — coins that feed an upgrade-tree factory. The novelty isn't the Pomodoro timer; it's the 74-rank title ladder that takes you from *Focused Weaver* at Level 1 all the way up through textile aristocracy, corporate oligarchs, posthuman uploads, Dyson-shell megastructures, and eventually heat-death transcendence — all with sardonic tooltips in the voice of a wry omniscient narrator haunting a bureaucratic office nightmare.

Titles and tier names stay sealed behind fog-of-war until you earn them. The ladder is a surprise mechanic, not a roadmap.

## Install (Developer Mode, unpacked)

1. Download the latest `pixelfocus-v3.19.17.zip` from the [Releases page](https://github.com/Katz131/pixelfocus/releases/latest).
2. Unzip it anywhere you like — for example, `C:\PixelFocus\`.
3. Open Chrome (or Brave / Edge) and go to `chrome://extensions`.
4. Flip the **Developer mode** switch on in the top-right corner.
5. Click **Load unpacked** and select the unzipped `pixelfocus-v3.19.17` folder.
6. Pin the extension by clicking the puzzle-piece icon in your toolbar and hitting the pin next to PixelFocus.

That's it. Click the extension icon to open the main window.

## Updating

When a new version ships, download the new zip from Releases, unzip it over the old folder (or into a fresh folder), then open `chrome://extensions` and click the little circular-arrow **reload** button under PixelFocus. Your saved textiles, gallery progress, factory upgrades, and streak data all live in `chrome.storage.local` and survive the reload untouched.

## Features

- **Wall-clock Pomodoro timer** that defeats Chrome's background-tab `setInterval` throttling by pinning the session end to `Date.now()`.
- **Always-on-top pop-out timer** via the Document Picture-in-Picture API — click POP OUT and the timer floats above every other window.
- **15-second pre-session countdown** so you can finish breathing, lock your phone in a drawer, and commit.
- **74-rank title ladder** across 10 tiers, with sardonic office-dystopia tooltips and full fog-of-war locking for unreached ranks and tiers.
- **Textile loom + pixel art gallery** — spend textiles to weave increasingly large pixel artworks.
- **Factory upgrade tree** unlocked at Tier 3, with its own separate money currency earned from combo bursts, daily marathon thresholds, and streak-weighted end-of-day lump sums.
- **Zero network calls.** Everything runs locally. No telemetry, no accounts, no cloud sync, nothing leaves your browser.

## Privacy

PixelFocus stores all of its state (todo items, XP, textiles, coins, gallery, factory progress, streak history) in `chrome.storage.local`, which lives exclusively on your device. It does not transmit any data over the network, does not use analytics, does not phone home, and does not require an account. The `tabs` permission is requested only to open the gallery and factory as full-tab pages; it is never used to read page content from other sites. The `notifications` permission is used only to show the "session complete" toast when a focus session finishes. The `alarms` permission is used only to schedule end-of-session checks.

## Building from source

You don't need a build step to run PixelFocus — it's vanilla HTML / CSS / JS with no framework and no transpiler. If you want to package a release zip yourself (instead of downloading one from Releases), double-click `package-extension.bat` in this folder. It will produce `pixelfocus-v3.19.17.zip` next to itself using PowerShell's built-in `Compress-Archive`. No Node, no npm, no toolchain.

## File map

```
pixelfocus/
├── manifest.json           Manifest V3 declaration
├── popup.html              Main extension window (todo list + timer + loom entry)
├── app.js                  The whole app (4300+ lines, IIFE, no framework)
├── background.js           Service worker
├── gallery.html / .js      Pixel art gallery full-tab page
├── factory.html / .js      Factory upgrade tree full-tab page
├── stage-entries.js        Tier-gated narrative entries
├── msglog.js               In-world message log
├── sounds.js               Procedural chiptune sound effects
├── tips.js                 Rotating tip banners
├── tooltip.js              Hover tooltip engine
├── fonts.css               Press Start 2P fallback
├── icons/                  Extension icons (16, 32, 48, 128)
├── package-extension.bat   Windows zip packager
└── docs/                   GitHub Pages landing site
    └── index.html
```

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgments

Sardonic tooltip voice is an original pastiche inspired by the wry omniscient narrator of a certain 2013 indie puzzle game and the bureaucratic dystopia of a certain 1985 Terry Gilliam film. No copyrighted material is reproduced; all prose is original.
