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

## Communication Preferences

- When giving numbered steps/instructions, always format as a proper numbered list so the user can copy-paste it directly (including the numbers) to send to others
- Always tell the user the new version number when bumping
- The user often relays instructions to another user (Giulia) who cannot code — keep ELI5 instructions simple and copy-paste ready
- User prefers military/24-hour time (setting available in extension)
