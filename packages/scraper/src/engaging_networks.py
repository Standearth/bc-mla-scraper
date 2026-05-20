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
8. Biography 1 (Constituency ID): Populated with the 3-letter Constituency Code (Used for Matching).
9. Biography 2 (Postal Code): Constituency Office Postal Code.
10. X Handle (Ministry Email): Populated with the member's ministry email address.
11. Biography 4 (Roles): Populated with the member's roles/ministries.
12. Biography 5 (Honourable): 'Hon.' if `isHonourable` flag is True.
13. Biography 6 (Counsel): 'K.C.' if `isCounsel` flag is True.
14. Biography 7 (Profile URL): Official Legislature Profile URL.
15. Party: Populated with the member's full party name.
16. Output format: 'bc_mlas_en_YYYYMMDD.csv' (default, can be overridden)
"""

import argparse
import csv
from datetime import datetime

from bc_mla_scraper import MLAScraper


def process_for_engaging_networks(mlas):
    """
    Takes the raw parsed MLA dictionaries and maps them to the Engaging Networks format.
    """
    en_rows = []

    for mla in mlas:
        # Determine Title (Fallback to prefix)
        title = mla.get("isDoctorClean") or mla.get("prefix", "")

        # Recombine the street and PO Box
        street = mla.get("conOfficeAddressCleanStreet", "")
        po_box = mla.get("conOfficeAddressCleanPOBox", "")
        combined_street = street
        if po_box:
            combined_street = f"{street}, {po_box}" if street else po_box

        # Determine Primary Phone (Prefer Toll-Free)
        phone = mla.get("conOfficeTollFreeClean")
        if not phone:
            phone = mla.get("conOfficePhoneClean")

        # Construct the final row mapping
        row = {
            "First Name": mla.get("firstName", ""),
            "Last Name": mla.get("lastName", ""),
            "Email Address": mla.get("email", ""),
            "Street Address": combined_street,
            "Suite": mla.get("conOfficeAddressCleanSuite", ""),
            "City": mla.get("conOfficeCity", ""),
            "Province": "BC",
            "Country": "Canada",
            "Phone Number": phone,
            "Title": title,
            "Organization": mla.get("constituencyName", ""),
            "Biography 1 (Constituency ID)": str(mla.get("districtCode", "")),
            "Biography 2 (Postal Code)": mla.get("conOfficePostalCode", ""),
            "X Handle (Ministry Email)": mla.get("ministryEmail", ""),
            "Biography 4 (Roles)": mla.get("roles", ""),
            "Biography 5 (Honourable)": mla.get("isHonourableClean", ""),
            "Biography 6 (Counsel)": mla.get("isCounselClean", ""),
            "Biography 7 (Profile URL)": mla.get("profileUrl", ""),
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


def export_select_field(raw_mlas, filename):
    """Writes a text file formatted for Engaging Networks select fields (label~value)."""
    if not raw_mlas:
        return

    # Use a dictionary to get unique district code -> name pairs
    districts = {}
    for mla in raw_mlas:
        code = mla.get("districtCode")
        name = mla.get("constituencyName")
        if code and name:
            districts[code] = name

    # Write to text file
    with open(filename, mode="w", encoding="utf-8") as file:
        # Sort by the 3-letter code alphabetically
        for code in sorted(districts.keys()):
            file.write(f"{districts[code]}~{code}\n")

    print(f"Select field format successfully saved to {filename}")


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

    # Figure out the select output filename (e.g., bc_mlas_en_20260519_select.txt)
    if args.output.endswith(".csv"):
        select_filename = args.output.replace(".csv", "_select.txt")
    else:
        select_filename = f"{args.output}_select.txt"

    # Export the text file using the raw data (which has the districtCode)
    export_select_field(raw_mlas, select_filename)


if __name__ == "__main__":
    main()
