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

## Fallbacks

- If PDF continues to fail, `make epub` will still generate EPUBs.
- You can also export DOCX by running:

```bash
find content -name 'README.md' -exec sh -c 'd=$(dirname "{}"); out=printables/"$(basename "$d").docx"; pandoc --resource-path="$d:." "{}" -o "$out"' \;
```
