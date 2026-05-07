"""
engaging_networks.py

A post-processing script for the BC MLA Scraper that outputs data in a
format specifically tailored for Engaging Networks.

Conversion Specification:
-------------------------
1. Title: Prefilled with `Dr.` if `isDoctor` is True, otherwise falls back to standard prefix.
2. Address: Sourced entirely from the primary constituency office address.
3. Suite & Street Address Parsing:
   - Strips double-spaces universally.
   - Uses advanced regex cascading to separate suite/unit numbers from the street address.
   - Handles multi-units ("#203 & 204", "Units 7 & 8") correctly without breaking compound street numbers.
   - Safely consumes misplaced hyphens between the street number and street name.
   - Resolves inverted PO Box edge cases by dynamically matching and removing redundant city names.
4. Province: Hardcoded to 'BC'.
5. Country: Hardcoded to 'Canada'.
6. Phone Number: Uses Constituency Toll-Free phone if present, otherwise Constituency Local phone.
   - Formats to standard North American style: (XXX) YYY-ZZZZ
7. Organization: Populated with the Constituency Name.
8. Constituency: Populated with the Constituency ID.
9. Biography 1: 'Hon.' if `isHonourable` flag is True.
10. Biography 2: 'K.C.' if `isCounsel` flag is True.
11. Biography 4: Populated with the member's roles/ministries.
12. Biography 5: Legislative Office Phone Number (formatted).
13. Biography 6: Constituency Office Postal Code.
14. Biography 7: Official Legislature Profile URL.
15. X Handle: Placed here as a free field to hold the Ministry Email.
16. Party: Populated with the member's full party name.
17. Output format: 'bc_mlas_en_YYYYMMDD.csv' (default, can be overridden)
"""

import argparse
import csv
from datetime import datetime

from bc_mla_scraper import MLAScraper
from formatters import format_phone, parse_address


def process_for_engaging_networks(mlas):
    """
    Takes the raw parsed MLA dictionaries and maps them to the Engaging Networks format.
    """
    en_rows = []

    for mla in mlas:
        # Determine Title
        title = "Dr." if mla.get("isDoctor") else mla.get("prefix", "")

        # Parse Address (pass the city to help resolve messy PO Boxes)
        suite, street = parse_address(
            mla.get("conOfficeAddress", ""), mla.get("conOfficeCity", "")
        )

        # Determine Primary Phone (Prefer Toll-Free)
        phone = mla.get("conOfficeTollFree")
        if not phone:
            phone = mla.get("conOfficePhone")
        formatted_phone = format_phone(phone)

        # Format Legislative Phone for Bio 5
        leg_phone = format_phone(mla.get("legOfficePhone"))

        # Set Special Titles
        bio1 = "Hon." if mla.get("isHonourable") else ""
        bio2 = "K.C." if mla.get("isCounsel") else ""

        # Construct the final row mapping
        row = {
            "First Name": mla.get("firstName", ""),
            "Last Name": mla.get("lastName", ""),
            "Email Address": mla.get("email", ""),
            "Street Address": street,
            "Suite": suite,
            "City": mla.get("conOfficeCity", ""),
            "Province": "BC",
            "Country": "Canada",
            "Phone Number": formatted_phone,
            "Title": title,
            "Organization": mla.get("constituencyName", ""),
            "Constituency": str(mla.get("constituencyId", "")),
            "Biography 1": bio1,
            "Biography 2": bio2,
            "X Handle": mla.get("ministryEmail", ""),
            "Biography 4": mla.get("roles", ""),
            "Biography 5": leg_phone,
            "Biography 6": mla.get("conOfficePostalCode", ""),
            "Biography 7": mla.get("profileUrl", ""),  # Now holds the profile URL
            "Party": mla.get("partyName", ""),
        }
        en_rows.append(row)

    return en_rows


def export_to_csv(rows, filename):
    """Writes the processed rows to a CSV file."""
    if not rows:
        print("No data to export.")
        return

    fieldnames = list(rows[0].keys())

    with open(filename, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Data successfully saved to {filename}")


def main():
    # Pre-calculate the default filename so it can be shown in the help menu
    today_str = datetime.today().strftime("%Y%m%d")
    default_filename = f"bc_mlas_en_{today_str}.csv"

    parser = argparse.ArgumentParser(
        description="Fetch active BC MLA data and output it formatted for Engaging Networks."
    )

    parser.add_argument(
        "-o",
        "--output",
        default=default_filename,
        help=f"Output CSV filename (default: {default_filename})",
    )

    args = parser.parse_args()

    print("Initializing scraper...")
    scraper = MLAScraper()

    print("Fetching active MLA data...")
    try:
        raw_mlas = scraper.fetch_all()
        print(f"Retrieved {len(raw_mlas)} records.")
    except Exception as e:
        print(f"Failed to fetch data: {e}")
        return

    print("Processing data for Engaging Networks format...")
    en_mlas = process_for_engaging_networks(raw_mlas)

    # Use the parsed argument for the file export
    export_to_csv(en_mlas, args.output)


if __name__ == "__main__":
    main()
