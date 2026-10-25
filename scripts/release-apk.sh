#!/usr/bin/env bash
# Builds the signed release APK and publishes it to the private releases repo.
# Usage: scripts/release-apk.sh "notes"   (version is read from android/app/build.gradle)
set -euo pipefail
cd "$(dirname "$0")/.."
export JAVA_HOME="${JAVA_HOME:-C:/Android/jdk-21.0.12.1+1}" ANDROID_HOME="${ANDROID_HOME:-C:/Android/Sdk}"
REPO="Henchu28/vault-of-adventures-apk"
VERSION=$(grep versionName android/app/build.gradle | head -1 | cut -d'"' -f2)
npm run build
npx cap sync android
(cd android && ./gradlew.bat assembleRelease -Pandroid.overridePathCheck=true)
APK="android/app/build/outputs/apk/release/app-release.apk"
cp "$APK" "vault-of-adventures-v$VERSION.apk"
gh release create "v$VERSION" "vault-of-adventures-v$VERSION.apk" --repo "$REPO" --title "v$VERSION" --notes "${1:-Version $VERSION}"
rm "vault-of-adventures-v$VERSION.apk"
