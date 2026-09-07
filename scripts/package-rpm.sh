#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -d dist/linux-unpacked ]; then
    echo "dist/linux-unpacked is missing. Run 'npm run build' first." >&2
    exit 1
fi

APP_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.1.0")
TOP="$PWD/dist/rpmbuild"
RPMDIR="$PWD/dist/rpms"

rm -rf "$TOP" "$RPMDIR"
mkdir -p "$TOP/BUILD" "$TOP/RPMS" "$TOP/SOURCES" "$TOP/SPECS" "$TOP/SRPMS"
mkdir -p "$RPMDIR"

ICON_512="$TOP/SOURCES/nous-512.png"
if command -v convert >/dev/null 2>&1; then
    convert -background none assets/icons/logo.png -resize 512x512 "$ICON_512"
else
    cp assets/icons/logo.png "$ICON_512"
fi

rpmbuild -bb \
    --define "_topdir $TOP" \
    --define "_rpmdir $RPMDIR" \
    --define "app_version $APP_VERSION" \
    --define "unpacked_dir $PWD/dist/linux-unpacked" \
    --define "repo_dir $PWD" \
    --define "icon_512 $ICON_512" \
    "$@" packaging/nous.spec

echo
find "$RPMDIR" -name '*.rpm' -print