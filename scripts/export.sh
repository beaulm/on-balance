#!/usr/bin/env bash
set -euo pipefail

SRC=${1:-content}
OUT=${2:-printables}
mkdir -p "$OUT"

# Optional Pandoc defaults file
DEFAULTS=""
if [ -f docs/policies/pandoc.yaml ]; then
  DEFAULTS="--defaults docs/policies/pandoc.yaml"
fi

# PDF engine and template controls (override via env if desired)
PDF_ENGINE="${PDF_ENGINE:-}"
PDF_TEMPLATE="${PDF_TEMPLATE:-templates/print.latex}"

# Use an array so values with spaces stay intact
PDF_VARS=( -V fontsize=11pt -V lang=en )

pick_engine() {
  if command -v xelatex >/dev/null 2>&1; then echo xelatex; return; fi
  if command -v lualatex >/dev/null 2>&1; then echo lualatex; return; fi
  if command -v pdflatex >/dev/null 2>&1; then echo pdflatex; return; fi
  echo ""
}

if ! command -v pandoc >/dev/null 2>&1; then
  echo "Pandoc not found. Install pandoc to export files." >&2
  exit 1
fi

# If no engine was provided, try to pick one
if [ -z "$PDF_ENGINE" ]; then
  PDF_ENGINE="$(pick_engine)"
fi

# Build EPUB and PDF for each module with index.md
find "$SRC" -name 'index.md' | while read -r f; do
  moddir=$(dirname "$f")
  name=$(basename "$moddir")

  # EPUB
  pandoc $DEFAULTS "$f" \
    --from gfm \
    --metadata "title=${name}" \
    -o "$OUT/${name}.epub" \
  || echo "EPUB export failed for $name"

  # PDF
  if [ -n "$PDF_ENGINE" ]; then
    pandoc $DEFAULTS "$f" \
      --from gfm \
      --to pdf \
      --pdf-engine="$PDF_ENGINE" \
      --template="$PDF_TEMPLATE" \
      "${PDF_VARS[@]}" \
      --metadata "title=${name}" \
      -o "$OUT/${name}.pdf" \
    || echo "PDF export failed for $name (engine: $PDF_ENGINE)"
  else
    echo "No LaTeX engine found. Skipping PDF for $name. See docs/SETUP_PDF.md"
  fi
done
