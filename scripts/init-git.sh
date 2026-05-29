#!/usr/bin/env bash
# Sherpa — first-commit helper.
#
# Run this ONCE, in the sherpa/ folder, on your local machine.
# It initialises a fresh git repo, stages the files this project actually
# wants to track, and offers to make the first commit under your identity.

set -euo pipefail

cd "$(dirname "$0")/.."

# Refuse to clobber an existing repo.
if [ -d .git ]; then
  echo "✗ .git directory already exists. Aborting so we don't lose history."
  echo "  If you want a fresh start, remove .git manually and re-run."
  exit 1
fi

# Verify git is installed.
if ! command -v git >/dev/null 2>&1; then
  echo "✗ git is not installed. Install Xcode Command Line Tools first:"
  echo "    xcode-select --install"
  exit 1
fi

# Verify the user has a global git identity. If not, set it interactively.
USER_NAME="$(git config --global user.name 2>/dev/null || true)"
USER_EMAIL="$(git config --global user.email 2>/dev/null || true)"

if [ -z "$USER_NAME" ] || [ -z "$USER_EMAIL" ]; then
  echo "Git needs to know who you are."
  read -rp "  Your name: " input_name
  read -rp "  Your email: " input_email
  git config --global user.name "$input_name"
  git config --global user.email "$input_email"
  echo "✓ Git identity set: $input_name <$input_email>"
fi

echo "→ Initializing repo on branch 'main'..."
git init -b main >/dev/null

echo "→ Staging files (respecting .gitignore)..."
git add .

STAGED=$(git status --short | wc -l | tr -d ' ')
echo "✓ Staged $STAGED files."
echo
echo "Next, make the first commit:"
echo "  git commit -m \"Initial commit: Sherpa MVP (SHRP-001 → SHRP-016)\""
echo
echo "Then create a PRIVATE repo on GitHub (don't initialize with a README),"
echo "and run the two commands GitHub shows you, which look like:"
echo "  git remote add origin git@github.com:YOUR_USERNAME/sherpa.git"
echo "  git push -u origin main"
echo
echo "After that, every push to main auto-deploys on Vercel."
