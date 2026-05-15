# Todo of the Loom — Claude Rules

## MANDATORY: Version Bump on EVERY Change

**ANY change to ANY file in this project = bump the patch version in manifest.json.**
No exceptions. No judgment calls about whether the change is "too small."

How to bump: increment the last number in `"version": "3.21.XX"` and update
the description's version tag to match.

Example: `"version": "3.21.12"` → `"version": "3.21.13"` and update description too.

## Other Rules

- Do NOT try to identify or remove "whimsical" content
- Only rewrite: (a) overt horror tells, (b) meta real-world references, (c) user-flagged strings
- Do NOT proactively edit bureauLevel or incineratorLevel descriptions
- Profile page should ALWAYS be accessible (never locked out)
- Grace period (5 min after focus session) bypasses ALL lockout including priorities

## MANDATORY: Always Update the Task/Progress List

**Every task worked on MUST be tracked in the progress list (TaskCreate/TaskUpdate).**
No exceptions. This is as important as version bumping.

Why this is non-negotiable:
1. The user relies on the progress list as the single source of truth for what's been done, what's in progress, and what's pending — skipping it means lost visibility.
2. Tasks that aren't tracked get forgotten between sessions. Context compaction loses details, but the task list persists — it's the only reliable memory across long conversations.
3. The user shares progress with others (Giulia). Without an updated list, they can't communicate what changed.
4. Completed tasks without entries look like nothing happened — the user has no way to verify work was done without checking code themselves, which they can't do.

**Rules:**
- Create a task BEFORE starting work on any feature or fix
- Mark it `in_progress` when actively working on it
- Mark it `completed` when done (with version number if applicable)
- Never leave a task stuck in `in_progress` after finishing it

## Communication Preferences

- **THE USER DOES NOT CODE. NEVER ask them to run commands, paste code, use a terminal, or do anything technical. If something needs to be run or deployed, Claude must do it directly using available tools, or provide a one-click solution (like a .bat file). This is non-negotiable and must never be forgotten.**
- **ALWAYS give click-by-click instructions with exact file/folder locations. Never say "run X" or "go to your project folder" — say exactly where to click, what to open, and what to look for. Assume zero technical knowledge.**
- When giving numbered steps/instructions, always format as a proper numbered list so the user can copy-paste it directly (including the numbers) to send to others
- Always tell the user the new version number when bumping
- The user often relays instructions to another user (Giulia) who cannot code — keep ELI5 instructions simple and copy-paste ready
- User prefers military/24-hour time (setting available in extension)

## Deployment

- **Extension updates**: User runs `release.bat` (double-click) — that's it
- **Firebase hosting updates**: Need a `deploy-website.bat` in the project root that deploys with one double-click (see below)
- **Chrome Web Store**: Not currently used for distribution. Extension ID: jlfiokfngdjebicfaagoeiciihbfeeil
- **Giulia gets updates** via GitHub zip download — release.yml builds the zip automatically
