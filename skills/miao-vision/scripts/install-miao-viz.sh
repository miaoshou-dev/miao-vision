#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SKILL_DIR=$(dirname "$SCRIPT_DIR")
REPOSITORY=${MIAO_VISION_RELEASE_REPOSITORY:-miaoshou-dev/miao-vision}
COMPATIBILITY="$SKILL_DIR/cli-compatibility.json"
MIAO_HOME=${MIAO_VISION_HOME:-"$HOME/.miao-vision"}
BIN_DIR="$MIAO_HOME/bin"
DESTINATION="$BIN_DIR/miao-viz"

RELEASE_TAG=$(node -e 'const c=require(process.argv[1]); process.stdout.write(c.releaseTag)' "$COMPATIBILITY")
RECOMMENDED_VERSION=$(node -e 'const c=require(process.argv[1]); process.stdout.write(c.recommendedCliVersion)' "$COMPATIBILITY")

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
BASE_URL="https://github.com/$REPOSITORY/releases/download/$RELEASE_TAG"

if [ "${1:-}" = "--print-url" ]; then
  printf '%s/%s\n' "$BASE_URL" "$ASSET"
  exit 0
fi

if [ -x "$DESTINATION" ] && node "$SCRIPT_DIR/check-miao-viz.mjs" --candidate "$DESTINATION" --require-recommended --print-path >/dev/null 2>&1; then
  printf 'Using recommended miao-viz %s at %s\n' "$RECOMMENDED_VERSION" "$DESTINATION"
  exit 0
fi

TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/miao-viz-install.XXXXXX")
STAGED=
trap '[ -z "$STAGED" ] || rm -f "$STAGED"; rm -rf "$TMP_DIR"' EXIT HUP INT TERM

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

mkdir -p "$BIN_DIR"
chmod +x "$TMP_DIR/$ASSET"
STAGED=$(mktemp "$BIN_DIR/.miao-viz.XXXXXX")
cp "$TMP_DIR/$ASSET" "$STAGED"
chmod +x "$STAGED"
if ! node "$SCRIPT_DIR/check-miao-viz.mjs" --candidate "$STAGED" --require-recommended --print-path >/dev/null; then
  echo "Downloaded CLI failed version or capability verification; existing CLI was preserved." >&2
  exit 1
fi
mv -f "$STAGED" "$DESTINATION"
STAGED=
printf 'Installed miao-viz at %s\n' "$DESTINATION"
"$DESTINATION" --version
