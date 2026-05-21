# --- Variables ---
PUBLIC_DIR  := public
SCRAPER_PKG := packages/scraper
LOOKUP_PKG  := packages/district-lookup
GEO_PKG     := packages/geo-processor

ED_GEOJSON_IN  := data/BCGW_02001F02_1778300296741_14604.zip
ED_GEOJSON_OUT := public/bc_electoral_districts.geojson
TOLERANCE      ?= 0.0004


# --- Development ---

.PHONY: serve
serve:
	@echo "Starting local server at http://localhost:8000"
	python -m http.server --directory $(PUBLIC_DIR)

.PHONY: build
build:
	@echo "Building District Lookup Widget..."
	cd $(LOOKUP_PKG) && npm run build

.PHONY: scrape
scrape:
	@echo "Running Python Scraper..."
	# Assumes your venv is active or package is installed
	bc-mla-scraper --csv $(PUBLIC_DIR)/bc_mlas.csv --json $(PUBLIC_DIR)/bc_mlas.json --mapping $(PUBLIC_DIR)/district_codes.json --titles data/bc_mla_titles.csv

# --- Combined Commands ---

.PHONY: update
update: scrape build
	@echo "Data updated and Widget rebuilt."

.PHONY: install
install:
	@echo "Installing all dependencies..."
	cd $(LOOKUP_PKG) && npm install
	pip install -e $(SCRAPER_PKG)
	pip install -e $(GEO_PKG)

.PHONY: test
test:
	@echo "Running all tests..."
	@echo "--- Python ---"
	pytest $(SCRAPER_PKG)
	@echo "--- TypeScript ---"
	cd $(LOOKUP_PKG) && npm run test

.PHONY: process-geo
process-geo:
	@echo "Simplifying Electoral Boundaries (tolerance: $(TOLERANCE))..."
	simplify-geojson $(ED_GEOJSON_IN) -o $(ED_GEOJSON_OUT) -t $(TOLERANCE)
	@echo "Extracting district codes..."
	extract-mapping $(ED_GEOJSON_OUT) ED_ABBREVIATION ED_NAME -o $(PUBLIC_DIR)/district_codes.json

.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make serve    - Start local web server for the public/ directory"
	@echo "  make scrape   - Run the Python scraper to refresh data in public/"
	@echo "  make build    - Recompile the TypeScript widget and copy to public/"
	@echo "  make update   - Run scrape and build-widget together"
	@echo "  make install  - Install both Python and Node dependencies"
	@echo "  make test     - Run both Python and Vitest suites"
