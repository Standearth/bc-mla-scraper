# BC MLA Tools

A collection of tools to retrieve, format, and utilize active Member of Legislative Assembly (MLA) and electoral district data for the British Columbia Legislature.

This monorepo contains two primary packages:

1. **BC MLA Scraper**: A Python CLI and module to scrape the BC Legislature website.
2. **District Lookup Widget**: A drop-in Vanilla JS UI widget to search BC addresses and find electoral districts.

---

## 1. BC MLA Scraper (Python)

A Python module and command-line tool to retrieve, format, and export active Member of Legislative Assembly (MLA) data from the British Columbia Legislature.

### Installation

You can install this package locally using `pip`. Navigate to the `packages/scraper/` directory containing `pyproject.toml` and run:

```bash
pip install -e .
```

### Usage (Command-Line)

Once installed, you can run the scraper directly from your terminal.

By default, running the script without any arguments will fetch the data and save it to a `bc_mlas.csv` file in your current directory:

```bash
bc-mla-scraper
```

You can specify the output format and optionally provide custom filenames using the `--csv` and `--json` flags:

```bash
# Generate both default CSV and JSON files
bc-mla-scraper --csv --json

# Generate only a JSON file
bc-mla-scraper --json

# Generate files with custom names
bc-mla-scraper --csv my_custom_data.csv --json output_folder/my_data.json
```

### Usage (Python Module)

You can easily import and use the scraper in your own Python projects to handle the data programmatically:

```python
from bc_mla_scraper import MLAScraper

# Initialize the scraper
scraper = MLAScraper()

# Fetch all active MLA data
mla_data = scraper.fetch_all()
print(f"Retrieved {len(mla_data)} records.")

# Save directly to files
scraper.to_csv(mla_data, "output.csv")
scraper.to_json(mla_data, "output.json")
```

### Usage (Hotlinking)

The [csv](https://standearth.github.io/bc-mla-tools/bc_mlas.csv) and [json](https://standearth.github.io/bc-mla-tools/bc_mlas.json) files are updated nightly and hosted on GitHub pages, and you are welcome to hotlink them directly for use in other projects.

### Data Fields Included

The scraper standardizes and exports comprehensive data for each MLA, including:

- **Electoral District Details:** `constituencyId`, `constituencyName`
- **MLA Details:** `prefix`, `firstName`, `lastName`, `email`, `partyName`, `roles`, `electionYears`, `isHonourable`, `isDoctor`, `isCounsel`, `profileUrl`, `imagePath`
- **Legislative Office Details:** `legOfficeRoom`, `legOfficePhone`, `legOfficeFax`, `legBuildingAddress`, `legBuildingCity`, `legBuildingPostalCode`
- **Constituency Office Details:** `conOfficeAddress` (Parsed into Suite, Street, and PO Box), `conOfficeCity`, `conOfficePostalCode`, `conOfficePhone`, `conOfficeTollFree`, `conOfficeFax`, `conOfficeEmail`

---

## 2. District Lookup Widget (JavaScript/TypeScript)

A lightweight (~5kb) Vanilla JavaScript widget that attaches an autocomplete dropdown to any text input. It searches BC addresses using Elections BC's [My District](https://mydistrict.elections.bc.ca) tool, and optionally adds postcodes using the Google Maps Address Validation API.

### Example

[https://standearth.github.io/bc-mla-tools/lookup.html](https://standearth.github.io/bc-mla-tools/lookup.html)

### Integration

Include the [compiled JavaScript](https://standearth.github.io/bc-mla-tools/district-lookup.js) file in your HTML.

```html
<script src="https://standearth.github.io/bc-mla-tools/district-lookup.js"></script>
```

### Usage

Create a standard text input, and initialize the widget by targeting its selector:

```html
<input
  type="text"
  id="address-input"
  placeholder="Start typing your BC address..."
  autocomplete="off"
/>

<script>
  const widget = new DistrictLookup.LookupWidget("#address-input", {
    // Optional: Pass your Google Maps API Key to fetch full postal codes
    googleApiKey: "YOUR_GOOGLE_API_KEY_HERE",

    // Callback fired when a user selects an address
    onSelect: (data) => {
      console.log("Selected District:", data.districtName);
      console.log("Full Address Data:", data);
    },
  });
</script>
```

### Configuration Options

- **`googleApiKey`** _(string, optional)_: A Google Maps API key restricted to the Address Validation API. If provided, the widget will execute a background request to fetch the official postal code for the user's selected address.
- **`onSelect`** _(function, optional)_: A callback function that receives a `ValidatedAddress` object when the user clicks a result. The object contains:
  - `street`, `city`, `province`, `postalCode`
  - `districtName`, `districtAbbr`
  - `coordinates` (lat/lng)
  - `isGoogleValidated` (boolean indicating if the postal code was successfully retrieved)
  - `rawAzureData` (the original search result)

---

## Automated Deployments & Data Updates

This repository uses GitHub Actions to maintain fresh data without manual intervention.

Every night at 1:00 AM Pacific Time, the `deploy.yml` workflow:

1. Compiles the TypeScript `DistrictLookup` widget.
2. Runs the Python scraper to fetch the absolute latest MLA data from the BC Legislature.
3. Commits any changes to the data back to the repository's `main` branch (for version control).
4. Deploys the frontend tools and the updated CSV/JSON data to GitHub Pages via the `public/` folder.
