import argparse
import json
import os


def main():
    parser = argparse.ArgumentParser(
        description="Extract a key-value dictionary from a GeoJSON file's properties."
    )
    parser.add_argument("input", help="Path to the input GeoJSON file")
    parser.add_argument(
        "key_field", help="The property name to use as the dictionary Key"
    )
    parser.add_argument(
        "value_field", help="The property name to use as the dictionary Value"
    )
    parser.add_argument(
        "-o", "--output", required=True, help="Path to the output JSON file"
    )
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: File not found at {args.input}")
        return

    print(f"Extracting {args.key_field} -> {args.value_field} from {args.input}...")

    with open(args.input, "r", encoding="utf-8") as f:
        data = json.load(f)

    mapping = {}
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        k = props.get(args.key_field)
        v = props.get(args.value_field)

        if k and v:
            mapping[str(k).strip()] = str(v).strip()

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(mapping, f, indent=2, sort_keys=True)

    print(f"Successfully extracted {len(mapping)} records to {args.output}")


if __name__ == "__main__":
    main()
