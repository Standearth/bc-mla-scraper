from formatters import format_phone, parse_address


def test_format_phone():
    assert format_phone("2503873507") == "(250) 387-3507"

    # Toll-Free checks
    assert format_phone("1-866-305-3804") == "1-866-305-3804"
    assert format_phone("8003053804") == "1-800-305-3804"

    # Geographic 8XX area code check (e.g., 818 - Los Angeles)
    assert format_phone("1-818-555-1234") == "(818) 555-1234"
    assert format_phone("8185551234") == "(818) 555-1234"

    # Standard formats
    assert format_phone("604 744 0700") == "(604) 744-0700"
    assert format_phone("") == ""


def test_parse_address_standard():
    assert parse_address("2133 & 2135 East Hastings St", "Vancouver") == (
        "",
        "2133 & 2135 East Hastings St",
        "",
    )


def test_parse_address_suite_hyphen():
    assert parse_address("200-32988 1st Avenue", "Mission") == (
        "200",
        "32988 1st Avenue",
        "",
    )


def test_parse_address_multi_suite_ampersand():
    assert parse_address("Units 7 & 8, 14455 64 Avenue", "Surrey") == (
        "7 & 8",
        "14455 64 Avenue",
        "",
    )


def test_parse_address_multi_suite_rogue_hyphen():
    # Tests the tricky "Tepper" hyphenation case
    assert parse_address("#203 & 204 14360 - 64 Avenue", "Surrey") == (
        "203 & 204",
        "14360 64 Avenue",
        "",
    )


def test_parse_address_trailing_unit():
    assert parse_address("20349 88 Ave Unit 9", "Langley Twp") == (
        "9",
        "20349 88 Ave",
        "",
    )


def test_parse_address_po_box_standard():
    assert parse_address("530 Horse Lake Road, PO Box 95", "100 Mile House") == (
        "",
        "530 Horse Lake Road",
        "PO Box 95",
    )


def test_parse_address_po_box_inverted_with_city():
    # Tests the "Higginson" inverted PO Box case
    raw = "PO Box 250 Stn Main Parksville 172 Island Hwy East"
    assert parse_address(raw, "Parksville") == (
        "",
        "172 Island Hwy East",
        "PO Box 250 Stn Main",
    )


def test_parse_address_double_spaces():
    assert parse_address("123  Main   Street", "Victoria") == (
        "",
        "123 Main Street",
        "",
    )
