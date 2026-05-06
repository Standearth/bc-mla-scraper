import csv
import io
import json
import urllib.parse

import requests


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
            raise ValueError(
                "Error parsing current parliament info. Data structure may have changed."
            )

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
                        member: memberByMemberId {
                            prefix
                            firstName
                            lastName
                        }
                        constituency: constituencyByConstituencyId {
                            name
                        }
                        party: partyByPartyId {
                            name
                            abbreviation
                        }
                        image: imageBySmallImageId {
                            path
                            description
                        }
                    }
                }
            }""",
        }

        response = self.session.post(self.GRAPHQL_URL, json=payload)
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

        # Sort the list by constituencyId ascending, defaulting to 0 if missing
        raw_mlas = sorted(raw_mlas, key=lambda x: x.get("constituencyId") or 0)

        processed_mlas = []
        for node in raw_mlas:
            member = node.get("member") or {}
            constituency = node.get("constituency") or {}
            party = node.get("party") or {}
            image = node.get("image") or {}

            first_name = member.get("firstName", "")
            last_name = member.get("lastName", "")

            # Construct the dynamic profile URL slug
            url_slug = f"{last_name}-{first_name}"
            safe_slug = urllib.parse.quote(url_slug, safe="'")
            profile_url = f"https://www.leg.bc.ca/members/{parliament_number}{parliament_annotation}-Parliament/{safe_slug}"

            # Construct absolute Image URL
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
                    "partyName": party.get("name", ""),
                    "partyAbbreviation": party.get("abbreviation", ""),
                    "isHonourable": node.get("isHonourable", False),
                    "isDoctor": node.get("isDoctor", False),
                    "isCounsel": node.get("isCounsel", False),
                    "profileUrl": profile_url,
                    "imagePath": full_image_path,
                    "imageDescription": image.get("description", ""),
                }
            )

        return processed_mlas

    def to_csv(self, mlas, filename=None):
        """
        Converts the MLA data to CSV format.
        If filename is provided, writes to the file. Otherwise, returns the CSV as a string.
        """
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
        """
        Converts the MLA data to JSON format.
        If filename is provided, writes to the file. Otherwise, returns the JSON as a string.
        """
        if filename:
            with open(filename, mode="w", encoding="utf-8") as file:
                json.dump(mlas, file, indent=4)
            return True
        else:
            return json.dumps(mlas, indent=4)


if __name__ == "__main__":
    # Example usage if the script is run directly
    print("Initializing scraper...")
    scraper = MLAScraper()

    print("Fetching active MLA data...")
    data = scraper.fetch_all()

    print(f"Retrieved {len(data)} records.")

    # Write outputs to disk
    scraper.to_csv(data, "bc_mlas.csv")
    scraper.to_json(data, "bc_mlas.json")

    print("Data saved to bc_mlas.csv and bc_mlas.json")
