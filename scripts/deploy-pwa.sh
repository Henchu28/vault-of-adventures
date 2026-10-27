#!/usr/bin/env bash
# Builds the web app for the /vault-of-adventures/ sub-path and publishes it to the gh-pages branch (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")/.."
export MSYS_NO_PATHCONV=1  # Git Bash would otherwise rewrite the leading slash of VITE_BASE
export VITE_BASE=/vault-of-adventures/
REMOTE=$(git remote get-url origin)
NAME=$(git config user.name)
EMAIL=$(git config user.email)

npm run build
cp dist/index.html dist/404.html   # GitHub Pages serves 404.html for unknown paths, so the SPA router handles deep links
touch dist/.nojekyll

TMP=$(mktemp -d)
cp -r dist/. "$TMP"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="$NAME" -c user.email="$EMAIL" commit -q -m "Deploy PWA"
git push -f "$REMOTE" gh-pages
rm -rf "$TMP"
echo "Published: https://henchu28.github.io/vault-of-adventures/"
