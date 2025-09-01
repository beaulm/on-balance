.PHONY: pdf epub

# Ensure local 'make pdf' matches CI defaults
export PDF_ENGINE ?= xelatex
export PDF_TEMPLATE ?= templates/print.latex
export PDF_VARS ?= -V fontsize=11pt -V lang=en -V mathfont="Latin Modern Math"

pdf:
	bash scripts/export.sh content printables

epub:
	bash scripts/export.sh content printables
