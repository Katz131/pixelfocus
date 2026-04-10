# How to package PixelFocus into a zip to send to a friend

**The working method (saved here so we don't have to re-invent it):**

## Quick version

1. Open this folder in File Explorer (`C:\Users\theso\Pixel todo lists`)
2. Double-click **`package-extension.bat`**
3. A black window pops up, lists the files with `+` marks, prints **DONE!** in green
4. Press any key to close the window
5. A file called **`pixelfocus-v<VERSION>.zip`** now sits in this same folder — that's the file to send

The .bat file writes the zip next to itself (same folder), so you never have to hunt for it.

## Why this approach (and what failed)

- **Don't** use the bash/Linux sandbox to build the zip — its file mount can go stale and bake pre-version-bump source into the zip. Verified with Python: the sandbox served a truncated `app.js` that was missing recent features.
- **Don't** ship a plain `.ps1` script and tell a non-coder to "run it" — they end up pasting the path into File Explorer's search box or the Run dialog, which just shows "Windows can't find…" errors. The double-clickable `.bat` removes that friction entirely.
- **Don't** write the zip to the Desktop via `[Environment]::GetFolderPath('Desktop')` — OneDrive Desktop redirection makes it land in `C:\Users\theso\OneDrive\Desktop` while the user is staring at `C:\Users\theso\Desktop`. Write it **next to the script** instead.
- **Don't** pass three arguments to `Join-Path` — it only takes two. Use a two-step join (`$stagingIcons = Join-Path $staging 'icons'` then `Join-Path $stagingIcons $name`).

## The .bat file is the canonical artifact

`package-extension.bat` in this folder IS the method. Whenever the version number bumps, update these three lines inside the .bat:

1. `REM It will create "pixelfocus-v<VERSION>.zip"...`
2. `"$version = '<VERSION>';" ^`
3. `echo   %~dp0pixelfocus-v<VERSION>.zip`

(Or do a find-replace on the old version string.)

## Files the .bat includes (allowlist)

Top-level JS/HTML/CSS:
`manifest.json, background.js, popup.html, app.js, gallery.html, gallery.js, factory.html, factory.js, stage-entries.js, msglog.js, sounds.js, tips.js, tooltip.js, fonts.css`

Plus `icons/*.png` (the three extension icons).

Anything not on this list (dev notes, old backups, this file itself, the .bat itself, .ps1, previous zips) is deliberately excluded so the friend's copy stays lean.

## Friend's install steps (what to tell them when you send the zip)

1. Unzip the file anywhere (Desktop is fine).
2. Open Chrome → address bar → `chrome://extensions`
3. Flip **Developer mode** toggle on (top-right).
4. Click **Load unpacked** (top-left) and pick the unzipped folder.
5. The PixelFocus icon appears in their toolbar — click it to open.

## Safety note

The .bat only **reads** source files and **writes** one zip file. It never touches Chrome, your extension storage, tasks, bundles, gallery art, factory progress, or anything else. Your progress lives inside Chrome's local storage for the installed extension, not in these source files.
