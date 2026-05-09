import argparse
import os
import tempfile
import zipfile

import geopandas as gpd
import topojson as tp


def process_file(input_path, output_path, tolerance):
    print(f"Loading {input_path}...")

    # 1. Determine file type and load accordingly
    ext = os.path.splitext(input_path)[1].lower()

    if ext == ".zip":
        with tempfile.TemporaryDirectory() as tmpdirname:
            with zipfile.ZipFile(input_path, "r") as z:
                geojson_files = [f for f in z.namelist() if f.endswith(".geojson")]

                if not geojson_files:
                    print("Error: No .geojson file found in the zip archive.")
                    return

                target_file = geojson_files[0]
                extracted_path = z.extract(target_file, tmpdirname)

                print(f"Reading '{target_file}' from zip into GeoPandas...")
                gdf = gpd.read_file(extracted_path)

    elif ext in [".geojson", ".json"]:
        print("Reading GeoJSON directly into GeoPandas...")
        gdf = gpd.read_file(input_path)

    else:
        print(
            f"Error: Unsupported file extension '{ext}'. Please provide a .zip or .geojson file."
        )
        return

    # 2. Build topology and simplify
    print("Building topology and simplifying (Visvalingam-Whyatt)...")
    topo = tp.Topology(gdf, prequantize=False)
    simplified_topo = topo.toposimplify(tolerance)

    assert simplified_topo is not None, "Topology simplification failed"
    gdf_simplified = simplified_topo.to_gdf()

    # 3. Determine output path if not provided
    if not output_path:
        base_name = os.path.splitext(os.path.basename(input_path))[0]
        output_path = f"{base_name}_simplified.geojson"

    # 4. Export with precision optimization
    print(f"Saving optimized file to {output_path}...")
    gdf_simplified.to_file(output_path, driver="GeoJSON", COORDINATE_PRECISION=5)

    # Calculate and show size reduction
    original_size = os.path.getsize(input_path) / (1024 * 1024)
    new_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Original file size:       {original_size:.2f} MB")
    print(f"Simplified GeoJSON size:  {new_size:.2f} MB")
    print("Done!")


def main():
    parser = argparse.ArgumentParser(
        description="Extract, simplify, and export GeoJSON from a file or zip."
    )
    parser.add_argument("input", help="Path to the input .zip or .geojson file")
    parser.add_argument(
        "-o", "--output", help="Path to the output .geojson file (optional)"
    )
    parser.add_argument(
        "-t",
        "--tolerance",
        type=float,
        default=0.001,
        help="Simplification tolerance in degrees (default: 0.001)",
    )

    args = parser.parse_args()
    process_file(args.input, args.output, args.tolerance)


if __name__ == "__main__":
    main()
