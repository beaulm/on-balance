# PDF Export Setup

Pandoc needs a LaTeX engine to make PDFs. Any of these work: `xelatex`, `lualatex`, or `pdflatex`.

## Debian/Ubuntu/Mint

```bash
sudo apt update
sudo apt install -y texlive-latex-base texlive-latex-recommended texlive-latex-extra texlive-fonts-recommended texlive-fonts-extra texlive-xetex lmodern
```

Then run:

```bash
make pdf
```

## macOS

- Install MacTeX (full) or BasicTeX, then:

```bash
sudo tlmgr update --self && sudo tlmgr install collection-latexrecommended collection-fontsrecommended xetex
```

## Fallbacks

- If PDF continues to fail, `make epub` will still generate EPUBs.
- You can also export DOCX by running:

```bash
find content -name 'index.md' -exec sh -c 'out=printables/"$(basename $(dirname {})).docx"; pandoc "{}" -o "$out"' \;
```
