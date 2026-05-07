"""
formatters.py

Centralized string formatting, parsing, and validation functions
for BC MLA data.
"""

import re


def format_phone(phone_str):
    """Formats a raw string of digits into a standard (XXX) YYY-ZZZZ phone number."""
    if not phone_str:
        return ""

    digits = re.sub(r"\D", "", phone_str)

    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    elif len(digits) == 11 and digits.startswith("1"):
        return f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"

    return phone_str.strip()


def parse_address(address_str, city=""):
    """
    Parses a raw address string to separate the suite/unit from the street address.
    Uses a cascading series of safe regex patterns to prevent false splits.
    Returns a tuple of (suite, street_address).
    """
    if not address_str:
        return "", ""

    # Clean up double-spaces
    address_str = re.sub(r"\s+", " ", address_str.strip())

    # Handle messy PO Box lines (e.g. "PO Box 250 Stn Main Parksville 172 Island Hwy East")
    if city:
        po_box_pattern = (
            r"(?i)^(P\.?O\.?\s*Box\s+.*?)\s+" + re.escape(city) + r"\s+(.*)$"
        )
        m = re.match(po_box_pattern, address_str)
        if m:
            address_str = f"{m.group(2).strip()}, {m.group(1).strip()}"

    # 1. Trailing unit (e.g., "20349 88 Ave Unit 9")
    m = re.match(r"(?i)^(.*?)\s+(?:Units?|Suite|#)\s*([A-Za-z0-9\-\&/]+)$", address_str)
    if m:
        return m.group(2).strip(), m.group(1).strip()

    # 2. Explicit Prefix Unit
    m = re.match(
        r"(?i)^(?:(?:Units?|Suite)\s+|#\s*)([A-Za-z0-9/]+(?:\s*(?:&|and)\s*[A-Za-z0-9/]+)?)[,\-\s–]+(\d+)[,\s\-–]+(.*)$",
        address_str,
    )
    if m:
        return m.group(1).strip(), f"{m.group(2)} {m.group(3)}".strip()

    # 3. Implicit Hyphenated Suite
    m = re.match(r"^([A-Za-z0-9/]+)\s*[\-–]\s*(\d+)[,\s\-–]+(.*)$", address_str)
    if m:
        return m.group(1).strip(), f"{m.group(2)} {m.group(3)}".strip()

    # 4. Implicit alphanumeric suite separated by space
    m = re.match(r"^([0-9]+[A-Za-z])\s+(\d+)[,\s\-–]+(.*)$", address_str)
    if m:
        return m.group(1).strip(), f"{m.group(2)} {m.group(3)}".strip()

    # 5. Comma separated prefix
    m = re.match(r"^([^,]+),\s*(\d+)\s+(.*)$", address_str)
    if m:
        g1 = m.group(1).strip()
        if not re.search(r"(?i)box", g1):
            return g1, f"{m.group(2)} {m.group(3)}".strip()

    return "", address_str
