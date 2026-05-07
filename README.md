# BC MLA Scraper

A Python module and command-line tool to retrieve, format, and export active Member of Legislative Assembly (MLA) data from the British Columbia Legislature.

**Author:** Matthew Carroll (stand.earth)

## Installation

You can install this package locally using `pip`. Navigate to the directory containing `pyproject.toml` and run:

```bash
pip install -e .
```

## Usage

### As a Command-Line Tool

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

### As a Python Module

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

# Or get the data as formatted strings (useful for passing to APIs or databases)
csv_string = scraper.to_csv(mla_data)
json_string = scraper.to_json(mla_data)
```

## Data Fields Included

The scraper standardizes and exports the following fields for each MLA:

**Electoral District Details:**

- `constituencyId`: The ID of the electoral district.
- `constituencyName`: The name of the electoral district.

**MLA Details:**

- `prefix`: The member's prefix (e.g., Mr., Ms., Hon.).
- `firstName`: The member's first name.
- `lastName`: The member's last name.
- `email`: The member's primary legislative email address.
- `partyName`: The full name of the member's political party.
- `partyAbbreviation`: The abbreviated party name (not actually abbreviated most of the time, but it's what the legislature site provides.)
- `roles`: A string containing the member's active roles or ministries (separated by `|`).
- `electionYears`: A string listing the years the member was elected.
- `isHonourable`: Boolean indicating if the member holds the "Honourable" title.
- `isDoctor`: Boolean indicating if the member is a doctor.
- `isCounsel`: Boolean indicating if the member is Queen's/King's Counsel.
- `profileUrl`: The dynamically generated, absolute URL to the member's official profile page.
- `imagePath`: The absolute URL to the member's official headshot image.
- `imageDescription`: The alt-text description for the headshot.

**Legislative Office Details:**

- `legOfficeRoom`: The room number or name of their legislative office.
- `legOfficePhone`: The phone number for their legislative office.
- `legOfficeFax`: The fax number for their legislative office.
- `legBuildingAddress`: The street address of the legislative building.
- `legBuildingCity`: The city of the legislative building (e.g., Victoria).
- `legBuildingPostalCode`: The postal code of the legislative building.

**Constituency Office Details:**

- `conOfficeAddress`: The street address of their primary constituency office.
- `conOfficeCity`: The city of their constituency office.
- `conOfficePostalCode`: The postal code of their constituency office.
- `conOfficePhone`: The local phone number for their constituency office.
- `conOfficeFax`: The fax number for their constituency office.
- `conOfficeTollFree`: The toll-free phone number for their constituency office.
- `conOfficeEmail`: The general contact email for the constituency office.
