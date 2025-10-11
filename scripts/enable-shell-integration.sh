#!/usr/bin/env bash
# enable-shell-integration.sh
#
# Idempotent script to append VS Code shell integration snippet to common POSIX shells (~/.bashrc, ~/.profile, ~/.zshrc).
# Usage:
#   bash scripts/enable-shell-integration.sh

SNIPPET='[ "$TERM_PROGRAM" = "vscode" ] && source "$(code --locate-shell-integration-path bash)"'

FILES=("$HOME/.bashrc" "$HOME/.profile" "$HOME/.zshrc")

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    if grep -Fq "$SNIPPET" "$f"; then
      echo "Snippet already present in $f"
    else
      echo "\n$SNIPPET" >> "$f"
      echo "Appended snippet to $f"
    fi
  else
    # create and append
    printf "%s\n" "$SNIPPET" > "$f"
    echo "Created and wrote snippet to $f"
  fi
done

echo "Open a new terminal inside VS Code to activate the change."
