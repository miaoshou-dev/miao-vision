#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SKILL_DIR=$(dirname "$SCRIPT_DIR")
REPOSITORY=${MIAO_VISION_RELEASE_REPOSITORY:-miaoshou-dev/miao-vision}

case "$(uname -s)" in
  Darwin) OS=darwin ;;
  Linux) OS=linux ;;
  *) echo "Unsupported operating system: $(uname -s)" >&2; exit 1 ;;
esac

case "$(uname -m)" in
  x86_64|amd64) ARCH=x64 ;;
  arm64|aarch64) ARCH=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

ASSET="miao-viz-$OS-$ARCH"
BASE_URL="https://github.com/$REPOSITORY/releases/latest/download"

if [ "${1:-}" = "--print-url" ]; then
  printf '%s/%s\n' "$BASE_URL" "$ASSET"
  exit 0
fi

TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/miao-viz-install.XXXXXX")
trap 'rm -rf "$TMP_DIR"' EXIT HUP INT TERM

curl -fsSL "$BASE_URL/$ASSET" -o "$TMP_DIR/$ASSET"
curl -fsSL "$BASE_URL/miao-viz-checksums.txt" -o "$TMP_DIR/checksums.txt"

EXPECTED=$(awk -v asset="$ASSET" '$2 == asset { print $1 }' "$TMP_DIR/checksums.txt")
if [ -z "$EXPECTED" ]; then
  echo "No checksum found for $ASSET" >&2
  exit 1
fi

if command -v shasum >/dev/null 2>&1; then
  ACTUAL=$(shasum -a 256 "$TMP_DIR/$ASSET" | awk '{ print $1 }')
elif command -v sha256sum >/dev/null 2>&1; then
  ACTUAL=$(sha256sum "$TMP_DIR/$ASSET" | awk '{ print $1 }')
else
  echo "A SHA-256 tool (shasum or sha256sum) is required." >&2
  exit 1
fi

if [ "$EXPECTED" != "$ACTUAL" ]; then
  echo "Checksum verification failed for $ASSET" >&2
  exit 1
fi

mkdir -p "$SKILL_DIR/bin"
chmod +x "$TMP_DIR/$ASSET"
mv "$TMP_DIR/$ASSET" "$SKILL_DIR/bin/miao-viz"
"$SKILL_DIR/bin/miao-viz" --version
