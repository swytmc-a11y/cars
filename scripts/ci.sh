#!/usr/bin/env sh
set -eu
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
printf '%s\n' 'Running Sawn non-GitHub CI checks...'
cd "$ROOT_DIR/services/api"
npm install
npm run build
npm test
if command -v flutter >/dev/null 2>&1; then
  cd "$ROOT_DIR/apps/mobile"
  flutter pub get
  flutter test
else
  printf '%s\n' 'Flutter SDK is not installed; skipping mobile tests in this environment.' >&2
fi
