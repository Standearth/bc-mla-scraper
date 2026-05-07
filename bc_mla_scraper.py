import argparse
import csv
import io
import json
import urllib.parse

import requests

DEFAULT_CSV_FILE = "bc_mlas.csv"
DEFAULT_JSON_FILE = "bc_mlas.json"


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

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(self.HEADERS)

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

        # Sort the list by constituencyId ascending
        raw_mlas = sorted(raw_mlas, key=lambda x: x.get("constituencyId") or 0)

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

            # Construct dynamic profile URL slug
            url_slug = f"{last_name}-{first_name}"
            safe_slug = urllib.parse.quote(url_slug, safe="'")
            profile_url = f"https://www.leg.bc.ca/members/{parliament_number}{parliament_annotation}-Parliament/{safe_slug}"

            raw_image_path = image.get("path", "")
            full_image_path = (
                f"{self.IMAGE_BASE_URL}{raw_image_path}" if raw_image_path else ""
            )

            processed_mlas.append(
                {
                    "constituencyId": node.get("constituencyId", ""),
                    "constituencyName": constituency.get("name", ""),
                    "prefix": member.get("prefix", ""),
                    "firstName": first_name,
                    "lastName": last_name,
                    "email": member.get("legislativeEmail", ""),
                    "ministryEmail": ministry_email,  # <--- NEW FIELD ADDED HERE
                    "partyName": party.get("name", ""),
                    "partyAbbreviation": party.get("abbreviation", ""),
                    "roles": roles_str,
                    "electionYears": member.get("electionYears", ""),
                    "isHonourable": node.get("isHonourable", False),
                    "isDoctor": node.get("isDoctor", False),
                    "isCounsel": node.get("isCounsel", False),
                    "profileUrl": profile_url,
                    "imagePath": full_image_path,
                    "imageDescription": image.get("description", ""),
                    # Legislative Office Details
                    "legOfficeRoom": leg_office.get("name", ""),
                    "legOfficePhone": leg_office.get("phone", ""),
                    "legOfficeFax": leg_office.get("fax", ""),
                    "legBuildingAddress": leg_building.get("address", ""),
                    "legBuildingCity": leg_building.get("city", ""),
                    "legBuildingPostalCode": leg_building.get("postalcode", ""),
                    # Constituency Office Details
                    "conOfficeAddress": (con_office.get("address") or "").strip(),
                    "conOfficeCity": con_office.get("city", ""),
                    "conOfficePostalCode": con_office.get("postalcode", ""),
                    "conOfficePhone": con_office.get("phoneNumber", ""),
                    "conOfficeFax": con_office.get("fax", ""),
                    "conOfficeTollFree": con_office.get("tollFreePhone", ""),
                    "conOfficeEmail": con_office.get("email", ""),
                }
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
    args = parser.parse_args()

    if not args.csv and not args.json:
        args.csv = DEFAULT_CSV_FILE

    print("Initializing scraper...")
    scraper = MLAScraper()

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
