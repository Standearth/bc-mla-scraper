# BC MLA Scraper

A Python module and command-line tool to retrieve, format, and export active Member of Legislative Assembly (MLA) data from the British Columbia Legislature.

## Installation

You can install this package locally using `pip`. Navigate to the directory containing `pyproject.toml` and run:

```bash
pip install .
```

## Usage

### As a Command-Line Tool

Once installed, you can run the scraper directly from your terminal. By default, running the script will fetch the data and save it as both `bc_mlas.csv` and `bc_mlas.json` in your current directory:

```bash
python bc_mla_scraper.py
```

_(Or use `bc-mla-scraper` if you configured the entry point in your environment)._

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

- `constituencyId`: The ID of the electoral district.
- `constituencyName`: The name of the electoral district.
- `prefix`: The member's prefix (e.g., Mr., Ms., Hon.).
- `firstName`: The member's first name.
- `lastName`: The member's last name.
- `partyName`: The full name of the member's political party.
- `partyAbbreviation`: The abbreviated party name.
- `isHonourable`: Boolean indicating if the member holds the "Honourable" title.
- `isDoctor`: Boolean indicating if the member is a doctor.
- `isCounsel`: Boolean indicating if the member is Queen's/King's Counsel.
- `profileUrl`: The dynamically generated, absolute URL to the member's official profile page.
- `imagePath`: The absolute URL to the member's official headshot image.
- `imageDescription`: The alt-text description for the headshot.
