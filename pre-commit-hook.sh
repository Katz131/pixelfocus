#!/bin/sh
# pre-commit hook: rejects commits if manifest.json version hasn't changed.
# Install: copy this file to .git/hooks/pre-commit and make it executable.

PREV=$(git show HEAD:manifest.json 2>/dev/null | grep '"version"' | head -1 | sed 's/[^0-9.]//g')
CURR=$(grep '"version"' manifest.json | head -1 | sed 's/[^0-9.]//g')

if [ -z "$PREV" ]; then
  # First commit, no previous version to compare
  exit 0
fi

if [ "$PREV" = "$CURR" ]; then
  echo ""
  echo "!! COMMIT BLOCKED: manifest.json version has not been bumped !!"
  echo "!! Previous: $PREV  Current: $CURR"
  echo "!! Increment the patch number before committing."
  echo ""
  exit 1
fi

exit 0
