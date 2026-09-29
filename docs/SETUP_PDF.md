# PDF Export Setup

Pandoc needs a LaTeX engine to make PDFs. Any of these work: `xelatex`, `lualatex`, or `pdflatex`.

## Debian/Ubuntu/Mint

```bash
sudo apt update
sudo apt install -y pandoc texlive-latex-base texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended texlive-fonts-extra texlive-xetex lmodern librsvg2-bin
```

Then run:

```bash
make pdf
```

## macOS

- Install Pandoc and `librsvg` (provides `rsvg-convert` for SVG diagram conversion):

```bash
brew install pandoc librsvg
```

- Install MacTeX (full) or BasicTeX, then:

```bash
sudo tlmgr update --self && sudo tlmgr install collection-latexrecommended collection-fontsrecommended xetex
```

## Build guarantees

`make pdf` builds only PDFs and requires a LaTeX engine. `make epub` builds only
EPUBs and does not require LaTeX. Both commands fail on conversion errors, an
empty source directory, or a missing/empty output. Outputs are built in a temporary
directory before replacing existing files, so stale printables cannot hide failures.
Direct `bash scripts/export.sh content printables` builds both formats.

Run the export regression checks with `python3 -m unittest discover -s tests -v`.
They use fake converters and do not require Pandoc or LaTeX.

## Fallbacks

- If PDF continues to fail, `make epub` will still generate EPUBs.
- You can also export DOCX by running:

```bash
find content -name 'README.md' -exec sh -c 'd=$(dirname "{}"); name=$(basename "$d"); pandoc --lua-filter=scripts/export-links.lua -M module_slug="$name" --resource-path="$d:." "{}" -o "printables/${name}.docx"' \;
```
