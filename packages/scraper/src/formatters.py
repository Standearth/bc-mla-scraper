"""
formatters.py

Centralized string formatting, parsing, and validation functions
for BC MLA data.
"""

import re


def format_phone(phone_str):
    """
    Formats a raw string of digits into a standard (XXX) YYY-ZZZZ phone number.
    Toll-free numbers (800, 833, 844, 855, 866, 877, 888) are formatted as 1-XXX-XXX-XXXX.
    """
    if not phone_str:
        return ""

    digits = re.sub(r"\D", "", phone_str)

    # Standardize to 10 digits for prefix checking if it starts with '1'
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]

    if len(digits) == 10:
        area_code = digits[:3]
        toll_free_prefixes = {"800", "833", "844", "855", "866", "877", "888"}

        if area_code in toll_free_prefixes:
            return f"1-{area_code}-{digits[3:6]}-{digits[6:]}"
        else:
            return f"({area_code}) {digits[3:6]}-{digits[6:]}"

    return phone_str.strip()


def parse_address(address_str, city=""):
    """
    Parses a raw address string to separate the suite/unit, street address, and PO Box.
    Returns a tuple of (suite, street_address, po_box).
    """
    if not address_str:
        return "", "", ""

    # Clean up double-spaces
    address_str = re.sub(r"\s+", " ", address_str.strip())

    # Remove periods
    address_str = address_str.replace(".", "")
    street, po_box = address_str, ""

    # Check for city-mangled PO box first (like the Higginson Parksville case)
    if city:
        po_pattern = r"(?i)^(P\.?O\.?\s*Box\s+.*?)\s+" + re.escape(city) + r"\s+(.*)$"
        m = re.match(po_pattern, street)
        if m:
            po_box = m.group(1).strip()
            street = m.group(2).strip()

    # General PO Box extraction
    if not po_box:
        # Matches PO Box, P.O. Box, Box followed by numbers/letters
        m = re.search(r"(?i)(P\.?O\.?\s*Box\s+[A-Za-z0-9]+|Box\s+[A-Za-z0-9]+)", street)
        if m:
            po_box = m.group(1).strip()
            street = street.replace(m.group(0), "").strip()
            # Remove trailing/leading commas resulting from extraction
            street = re.sub(r",\s*$", "", street)
            street = re.sub(r"^,\s*", "", street)
            street = street.strip()

    # 1. Trailing unit (e.g., "20349 88 Ave Unit 9")
    m = re.match(r"(?i)^(.*?)\s+(?:Units?|Suite|#)\s*([A-Za-z0-9\-\&/]+)$", street)
    if m:
        return m.group(2).strip(), m.group(1).strip(), po_box

    # 2. Explicit Prefix Unit
    m = re.match(
        r"(?i)^(?:(?:Units?|Suite)\s+|#\s*)([A-Za-z0-9/]+(?:\s*(?:&|and)\s*[A-Za-z0-9/]+)?)[,\-\s–]+(\d+)[,\s\-–]+(.*)$",
        street,
    )
    if m:
        return m.group(1).strip(), f"{m.group(2)} {m.group(3)}".strip(), po_box

    # 3. Implicit Hyphenated Suite
    m = re.match(r"^([A-Za-z0-9/]+)\s*[\-–]\s*(\d+)[,\s\-–]+(.*)$", street)
    if m:
        return m.group(1).strip(), f"{m.group(2)} {m.group(3)}".strip(), po_box

    # 4. Implicit alphanumeric suite separated by space
    m = re.match(r"^([0-9]+[A-Za-z])\s+(\d+)[,\s\-–]+(.*)$", street)
    if m:
        return m.group(1).strip(), f"{m.group(2)} {m.group(3)}".strip(), po_box

    # 5. Comma separated prefix
    m = re.match(r"^([^,]+),\s*(\d+)\s+(.*)$", street)
    if m:
        g1 = m.group(1).strip()
        if not re.search(r"(?i)box", g1):
            return g1, f"{m.group(2)} {m.group(3)}".strip(), po_box

    return "", street, po_box


def clean_party_abbreviation(party_name, party_abbr):
    """Translates the messy party data into a clean, standard tag."""
    name = (party_name or "").upper()
    abbr = (party_abbr or "").upper()
    combined = f"{name} {abbr}"

    if "NDP" in combined or "NEW DEMOCRATIC PARTY" in combined:
        return "NDP"
    if "GREEN" in combined:
        return "Green"
    if "CONSERVATIVE" in combined:
        return "Conservative"
    return "Independent"
