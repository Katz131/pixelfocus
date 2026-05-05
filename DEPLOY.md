# Deploying Todo of the Loom

## Website (Firebase Hosting)

**What it updates:** The public profile page and leaderboard at https://todo-of-the-loom.web.app

**How to deploy:**
1. Open the **Pixel todo lists** folder
2. Double-click **deploy-website.bat**
3. Wait about 10 seconds — you'll see green "SUCCESS!" text when it's done

**What files get deployed:** Everything inside the `firebase-hosting` folder:
- `firebase-hosting/index.html` — the leaderboard page
- `firebase-hosting/p/index.html` — the public profile page

**How it works behind the scenes:**
- `deploy-website.bat` calls `deploy-hosting.ps1` (a PowerShell script)
- The script uses a service account key (`todo-of-the-loom-firebase-adminsdk-fbsvc-b2d375f258.json`) to authenticate directly with Google's servers
- It does NOT use the Firebase CLI exe at all — that thing is broken for command-line use
- It uploads files via the Firebase Hosting REST API

**Important files (don't delete these):**
- `deploy-website.bat` — the thing you double-click
- `deploy-hosting.ps1` — the script that does the actual work
- `todo-of-the-loom-firebase-adminsdk-fbsvc-b2d375f258.json` — the service account key that authenticates deploys

**Firebase project:** `todo-of-the-loom`
**Firebase config:** `firebase.json` and `.firebaserc` (these are only used by the CLI, not by our script, but keep them anyway)

---

## Extension (Chrome)

**How to update your own copy:**
1. Open the **Pixel todo lists** folder
2. Double-click **release.bat**

**How Giulia gets updates:**
- She downloads the latest zip from GitHub (release.yml builds it automatically when you push)

**Chrome Web Store:** Extension ID `jlfiokfngdjebicfaagoeiciihbfeeil` — not currently used for distribution

---

## Version Bumping

Every change to any file = bump the version in `manifest.json`.
Increment the last number in `"version": "3.23.XX"` and update the description to match.
