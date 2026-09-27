.PHONY: pdf epub
pdf:
	bash scripts/export.sh content printables pdf
epub:
	bash scripts/export.sh content printables epub
