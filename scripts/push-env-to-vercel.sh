#!/usr/bin/env bash
# Push the four user env vars from .env.local into Vercel production.
# Idempotent: removes existing values first, then adds fresh ones.
# Compatible with macOS's default bash 3.2.
#
# Run from the project root:
#   bash scripts/push-env-to-vercel.sh

set -e
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "✗ No .env.local found in project root."
  exit 1
fi

if [ ! -f .vercel/project.json ] && [ ! -f .vercel/repo.json ]; then
  echo "✗ Project not linked to Vercel. Run: npx vercel link"
  exit 1
fi

KEYS="NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_SITE_URL SUPABASE_SERVICE_ROLE_KEY AGENT_SESSION_MASTER_KEY"

# Extract the value of a key from .env.local. Strips surrounding quotes
# if present, and removes a trailing newline.
get_value() {
  grep -E "^${1}=" .env.local \
    | head -1 \
    | sed "s/^${1}=//" \
    | sed 's/^"//;s/"$//' \
    | tr -d '\n'
}

# Sanity-check all 4 are present locally
for KEY in $KEYS; do
  VALUE=$(get_value "$KEY")
  if [ -z "$VALUE" ]; then
    echo "✗ Missing $KEY in .env.local"
    exit 1
  fi
done

echo "→ Pushing env vars from .env.local to Vercel production..."
echo ""

for KEY in $KEYS; do
  VALUE=$(get_value "$KEY")
  echo "  • $KEY"

  # Remove any existing value (suppress errors if not present)
  npx --yes vercel env rm "$KEY" production --yes >/dev/null 2>&1 || true

  # Add fresh value, piped via stdin so we don't have to type/paste
  printf "%s" "$VALUE" | npx --yes vercel env add "$KEY" production >/dev/null
done

echo ""
echo "✓ All 4 env vars pushed to production."
echo ""
echo "→ Triggering fresh production deploy (no cache)..."
npx --yes vercel deploy --prod --force

echo ""
echo "✓ Deploy triggered."
echo ""
echo "Wait ~2 minutes, then refresh https://sherpakeys.com and try Log in."
