#!/usr/bin/env bash
set -euo pipefail
SRC=${1:-content}
OUT=${2:-printables}
mkdir -p "$OUT"

DEFAULTS=""
if [ -f docs/policies/pandoc.yaml ]; then
  DEFAULTS="--defaults docs/policies/pandoc.yaml"
fi

pick_engine() {
  if command -v xelatex >/dev/null 2>&1; then echo xelatex; return; fi
  if command -v lualatex >/dev/null 2>&1; then echo lualatex; return; fi
  if command -v pdflatex >/dev/null 2>&1; then echo pdflatex; return; fi
  echo ""
}

ENGINE=$(pick_engine)
if ! command -v pandoc >/dev/null 2>&1; then
  echo "Pandoc not found. Install pandoc to export files." >&2
  exit 1
fi

find "$SRC" -name 'README.md' | while read -r f; do
  moddir=$(dirname "$f")
  name=$(basename "$moddir")
  pandoc $DEFAULTS "$f" -o "$OUT/${name}.epub" || echo "EPUB export failed for $name"
  if [ -n "$ENGINE" ]; then
    pandoc $DEFAULTS "$f" --pdf-engine="$ENGINE" -o "$OUT/${name}.pdf" || echo "PDF export failed for $name (engine: $ENGINE)"
  else
    echo "No LaTeX engine found. Skipping PDF for $name. See docs/SETUP_PDF.md"
  fi
done
