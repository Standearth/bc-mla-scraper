import argparse
import csv
import io
import json
import os
import urllib.parse

import requests
from formatters import (
    clean_party_abbreviation,
    format_phone,
    parse_address,
)

DEFAULT_CSV_FILE = "bc_mlas.csv"
DEFAULT_JSON_FILE = "bc_mlas.json"

# Dynamically calculate the root of the repository (src -> scraper -> packages -> bc-mla-tools)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DEFAULT_MAPPING_FILE = os.path.join(ROOT_DIR, "public", "district_codes.json")
DEFAULT_TITLES_FILE = os.path.join(ROOT_DIR, "data", "bc_mla_titles.csv")


class MLAScraper:
    """A scraper to retrieve active Member of Legislative Assembly (MLA) data for British Columbia."""

    GRAPHQL_URL = "https://lims.leg.bc.ca/graphql"
    IMAGE_BASE_URL = "https://lims.leg.bc.ca/public"

    HEADERS = {
        "accept": "*/*",
        "content-type": "application/json",
        "origin": "https://dyn.leg.bc.ca",
        "referer": "https://dyn.leg.bc.ca/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }

    def __init__(
        self,
        mapping_file_path=DEFAULT_MAPPING_FILE,
        titles_file_path=DEFAULT_TITLES_FILE,
    ):
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)

        # Load the district code mappings into memory
        self.district_codes = {}
        if mapping_file_path and os.path.exists(mapping_file_path):
            with open(mapping_file_path, "r", encoding="utf-8") as f:
                self.district_codes = json.load(f)
        else:
            print(f"Warning: District mapping file not found at {mapping_file_path}.")
            print(
                "Run 'make process-geo' first to generate it. District codes will be blank."
            )

        # Load the manual prefix overrides into memory
        self.titles_mapping = {}
        if titles_file_path and os.path.exists(titles_file_path):
            with open(titles_file_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    key = (
                        row.get("firstName", "").strip(),
                        row.get("lastName", "").strip(),
                    )
                    self.titles_mapping[key] = row.get("prefix", "").strip()

    def get_current_parliament_info(self):
        """Fetches the ID and annotation (e.g. 'rd', 'th') of the currently active parliament."""
        payload = {
            "operationName": "GetCurrentParliament",
            "variables": {},
            "query": """query GetCurrentParliament {
                allParliaments(
                    condition: {active: true}
                    filter: {startDate: {isNull: false}}
                    orderBy: NUMBER_DESC
                    first: 1
                ) {
                    nodes {
                        number
                        annotation
                    }
                }
            }""",
        }

        response = self.session.post(self.GRAPHQL_URL, json=payload)
        response.raise_for_status()
        data = response.json()

        try:
            node = data["data"]["allParliaments"]["nodes"][0]
            return node["number"], node["annotation"]
        except (KeyError, IndexError):
            raise ValueError("Error parsing current parliament info.")

    def _fetch_mla_data(self, parliament_id):
        """Fetches the comprehensive MLA data for a specific parliament ID."""
        payload = {
            "operationName": "GetMLACompleteData",
            "variables": {"parliamentId": parliament_id},
            "query": """query GetMLACompleteData($parliamentId: Int!) {
                allMemberParliaments(condition: {parliamentId: $parliamentId, active: true}) {
                    nodes {
                        isCounsel
                        isDoctor
                        isHonourable
                        constituencyId
                        officePhone
                        member: memberByMemberId {
                            prefix
                            firstName
                            lastName
                            legislativeEmail
                            electionYears
                        }
                        constituency: constituencyByConstituencyId {
                            name
                            offices: constituencyOfficesByConstituencyId(first: 1, condition: {active: true}) {
                                nodes {
                                    address
                                    city
                                    postalcode
                                    phoneNumber
                                    fax
                                    tollFreePhone
                                    email
                                }
                            }
                        }
                        party: partyByPartyId {
                            name
                            abbreviation
                        }
                        image: imageBySmallImageId {
                            path
                            description
                        }
                        legOffice: legislatureOfficeByLegislativeOfficeId {
                            name
                            phone
                            fax
                            legBuilding: legislatureBuildingByBuildingId {
                                address
                                city
                                postalcode
                                province
                            }
                        }
                        ministry: memberRolesByMemberParliamentId(condition: {active: true}) {
                            nodes {
                                roleByRoleId {
                                    title
                                    email
                                }
                            }
                        }
                    }
                }
            }""",
        }

        response = self.session.post(self.GRAPHQL_URL, json=payload)

        if not response.ok:
            raise ValueError(f"GraphQL Error: {response.text}")

        response.raise_for_status()
        data = response.json()

        try:
            return data["data"]["allMemberParliaments"]["nodes"]
        except KeyError:
            raise ValueError("Error parsing MLA data. Data structure may have changed.")

    def fetch_all(self):
        """
        Fetches, flattens, and sorts the active MLA data.
        Returns a list of dictionaries containing the parsed data.
        """
        parliament_number, parliament_annotation = self.get_current_parliament_info()
        raw_mlas = self._fetch_mla_data(parliament_number)

        processed_mlas = []
        for node in raw_mlas:
            member = node.get("member") or {}
            constituency = node.get("constituency") or {}
            party = node.get("party") or {}
            image = node.get("image") or {}
            leg_office = node.get("legOffice") or {}
            leg_building = leg_office.get("legBuilding") or {}

            # Safely get the first constituency office if it exists
            con_offices = constituency.get("offices", {}).get("nodes", [])
            con_office = con_offices[0] if con_offices else {}

            # Extract and join all active roles/ministries, and hunt for a ministry email
            ministry_nodes = node.get("ministry", {}).get("nodes", [])
            roles = []
            ministry_emails = []
            for m in ministry_nodes:
                role_info = m.get("roleByRoleId")
                if role_info:
                    if role_info.get("title"):
                        roles.append(role_info.get("title"))
                    if role_info.get("email"):
                        ministry_emails.append(role_info.get("email"))

            roles_str = " | ".join(filter(None, roles))
            ministry_email = ministry_emails[0] if ministry_emails else ""

            first_name = member.get("firstName", "")
            last_name = member.get("lastName", "")
            constituency_name = constituency.get("name", "").strip()

            # Construct dynamic profile URL slug
            url_slug = f"{last_name}-{first_name}"
            safe_slug = urllib.parse.quote(url_slug, safe="'")
            profile_url = f"https://www.leg.bc.ca/members/{parliament_number}{parliament_annotation}-Parliament/{safe_slug}"

            raw_image_path = image.get("path", "")
            full_image_path = (
                f"{self.IMAGE_BASE_URL}{raw_image_path}" if raw_image_path else ""
            )

            # Get pre-processed data fields
            is_honourable = node.get("isHonourable", False)
            is_doctor = node.get("isDoctor", False)
            is_counsel = node.get("isCounsel", False)

            con_suite, con_street, con_po_box = parse_address(
                (con_office.get("address") or "").strip(), con_office.get("city", "")
            )

            party_clean = clean_party_abbreviation(
                party.get("name", ""), party.get("abbreviation", "")
            )

            prefix = member.get("prefix", "")
            prefix_clean = prefix

            # Check for a manual override using first and last name
            override_key = (first_name.strip(), last_name.strip())
            if override_key in self.titles_mapping:
                prefix_clean = self.titles_mapping[override_key]

            # Clean up em-dashes to match standard hyphens often found in GeoJSON
            normalized_name = constituency_name.replace("—", "-")

            # REVERSE LOOKUP: Find Code (key) where Name (value) matches
            district_code = next(
                (
                    code
                    for code, name in self.district_codes.items()
                    if name == normalized_name
                ),
                "",
            )

            processed_mlas.append(
                {
                    "districtCode": district_code,
                    "constituencyName": constituency_name,
                    "prefixRaw": prefix,
                    "prefix": prefix_clean,
                    "firstName": first_name,
                    "lastName": last_name,
                    "email": member.get("legislativeEmail", ""),
                    "ministryEmail": ministry_email,
                    "partyName": party.get("name", ""),
                    "partyAbbreviationRaw": party.get("abbreviation", ""),
                    "partyAbbreviation": party_clean,
                    "roles": roles_str,
                    "electionYears": member.get("electionYears", ""),
                    "isHonourable": is_honourable,
                    "honourableTitle": "Hon." if is_honourable else "",
                    "isDoctor": is_doctor,
                    "doctorTitle": "Dr." if is_doctor else "",
                    "isCounsel": is_counsel,
                    "counselTitle": "K.C." if is_counsel else "",
                    "profileUrl": profile_url,
                    "imagePath": full_image_path,
                    "imageDescription": image.get("description", ""),
                    # Legislative Office Details
                    "legOfficeRoom": leg_office.get("name", ""),
                    "legOfficePhoneRaw": leg_office.get("phone", ""),
                    "legOfficePhone": format_phone(leg_office.get("phone", "")),
                    "legOfficeFaxRaw": leg_office.get("fax", ""),
                    "legOfficeFax": format_phone(leg_office.get("fax", "")),
                    "legBuildingAddress": leg_building.get("address", ""),
                    "legBuildingCity": leg_building.get("city", ""),
                    "legBuildingPostalCode": leg_building.get("postalcode", ""),
                    # Constituency Office Details
                    "conOfficeAddressRaw": (con_office.get("address") or "").strip(),
                    "conOfficeSuite": con_suite,
                    "conOfficeStreet": con_street,
                    "conOfficePOBox": con_po_box,
                    "conOfficeCity": con_office.get("city", ""),
                    "conOfficePostalCode": con_office.get("postalcode", ""),
                    "conOfficePhoneRaw": con_office.get("phoneNumber", ""),
                    "conOfficePhone": format_phone(con_office.get("phoneNumber", "")),
                    "conOfficeFaxRaw": con_office.get("fax", ""),
                    "conOfficeFax": format_phone(con_office.get("fax", "")),
                    "conOfficeTollFreeRaw": con_office.get("tollFreePhone", ""),
                    "conOfficeTollFree": format_phone(
                        con_office.get("tollFreePhone", "")
                    ),
                    "conOfficeEmail": con_office.get("email", ""),
                }
            )

        processed_mlas = sorted(
            processed_mlas,
            key=lambda x: (
                x["districtCode"] if x["districtCode"] != "" else x["constituencyName"]
            ),
        )

        return processed_mlas

    def to_csv(self, mlas, filename=None):
        if not mlas:
            return ""
        fieldnames = list(mlas[0].keys())
        if filename:
            with open(filename, mode="w", newline="", encoding="utf-8") as file:
                writer = csv.DictWriter(file, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(mlas)
            return True
        else:
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(mlas)
            return output.getvalue()

    def to_json(self, mlas, filename=None):
        if filename:
            with open(filename, mode="w", encoding="utf-8") as file:
                json.dump(mlas, file, indent=4)
            return True
        else:
            return json.dumps(mlas, indent=4)


def main():
    parser = argparse.ArgumentParser(
        description="Scrape active MLA data from the British Columbia Legislature."
    )
    parser.add_argument(
        "--csv",
        nargs="?",
        const=DEFAULT_CSV_FILE,
        help=f"Export to a CSV file (default: {DEFAULT_CSV_FILE}).",
    )
    parser.add_argument(
        "--json",
        nargs="?",
        const=DEFAULT_JSON_FILE,
        help=f"Export to a JSON file (default: {DEFAULT_JSON_FILE}).",
    )
    parser.add_argument(
        "--mapping",
        default=DEFAULT_MAPPING_FILE,
        help="Path to the JSON file mapping district codes to names.",
    )
    parser.add_argument(
        "--titles",
        default=DEFAULT_TITLES_FILE,
        help="Path to the CSV file containing manual prefix overrides.",
    )
    args = parser.parse_args()

    if not args.csv and not args.json:
        args.csv = DEFAULT_CSV_FILE

    print("Initializing scraper...")
    scraper = MLAScraper(mapping_file_path=args.mapping, titles_file_path=args.titles)

    print("Fetching active MLA data...")
    try:
        data = scraper.fetch_all()
        print(f"Retrieved {len(data)} records.")
    except Exception as e:
        print(f"Failed to fetch data: {e}")
        return

    if args.csv:
        scraper.to_csv(data, args.csv)
        print(f"Data saved to CSV format -> {args.csv}")

    if args.json:
        scraper.to_json(data, args.json)
        print(f"Data saved to JSON format -> {args.json}")


if __name__ == "__main__":
    main()
