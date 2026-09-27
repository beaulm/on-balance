#!/usr/bin/env bash
set -euo pipefail
SRC=${1:-content}
OUT=${2:-printables}
FORMAT=${3:-all}

fail() { echo "$*" >&2; exit 1; }
case "$FORMAT" in
  pdf|epub|all) ;;
  *) fail "Unknown export format: $FORMAT (expected pdf, epub, or all)" ;;
esac

command -v pandoc >/dev/null 2>&1 || fail "Pandoc not found. Install pandoc to export files."
ENGINE=""
if [ "$FORMAT" != epub ]; then
  for candidate in xelatex lualatex pdflatex; do
    if command -v "$candidate" >/dev/null 2>&1; then ENGINE=$candidate; break; fi
  done
  [ -n "$ENGINE" ] || fail "No LaTeX engine found. See docs/SETUP_PDF.md"
fi

DEFAULTS=()
if [ -f docs/policies/pandoc.yaml ]; then
  DEFAULTS=(--defaults docs/policies/pandoc.yaml)
fi
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
FILTER=()
if [ -f "$SCRIPT_DIR/export-links.lua" ]; then
  FILTER=(--lua-filter="$SCRIPT_DIR/export-links.lua")
fi

mkdir -p "$OUT"
# Build into fresh files so checked-in or previous outputs cannot mask failure.
WORK=$(mktemp -d "$OUT/.export.XXXXXX")
trap 'rm -rf -- "$WORK"' EXIT
[ -d "$SRC" ] || fail "Source directory not found: $SRC"
for d in "$SRC"/*; do
  [ -d "$d" ] || continue
  if [ -f "$d/README.md" ]; then
    printf '%s\0' "$d/README.md"
  fi
done > "$WORK/sources"
[ -s "$WORK/sources" ] || fail "No module README.md files found in $SRC"

export_one() {
  local format=$1
  local f=$2
  local name=$3
  local moddir=$4
  local target="$WORK/$name.$format"
  local options=()
  if [ "$format" = pdf ]; then options=(--pdf-engine="$ENGINE"); fi
  if ! pandoc ${DEFAULTS[@]+"${DEFAULTS[@]}"} ${FILTER[@]+"${FILTER[@]}"} \
    -M module_slug="$name" \
    --resource-path="$moddir:." "$f" \
    ${options[@]+"${options[@]}"} -o "$target"; then
    fail "$format export failed for $name"
  fi
  [ -s "$target" ] || fail "$format export produced no nonempty file for $name"
  mv -- "$target" "$OUT/$name.$format"
}

while IFS= read -r -d '' f; do
  moddir=$(dirname -- "$f")
  name=$(basename -- "$moddir")
  if [ "$FORMAT" != pdf ]; then export_one epub "$f" "$name" "$moddir"; fi
  if [ "$FORMAT" != epub ]; then export_one pdf "$f" "$name" "$moddir"; fi
done < "$WORK/sources"
