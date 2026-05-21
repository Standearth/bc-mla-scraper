export class GeoLocator {
  private geojson: any | null = null;

  /**
   * Initialize with pre-loaded GeoJSON data (optional)
   */
  constructor(geojsonData?: any) {
    if (geojsonData) {
      this.geojson = geojsonData;
    }
  }

  /**
   * Fetch the GeoJSON from a URL
   */
  async load(url: string = "./bc_electoral_districts.geojson"): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON from ${url}`);
    }
    this.geojson = await response.json();
  }

  /**
   * Find the district properties that contain the given lat/lng
   */
  findDistrict(lat: number, lng: number): any | null {
    if (!this.geojson || !this.geojson.features) {
      throw new Error(
        "GeoJSON data is not loaded. Call load() first or pass data to the constructor.",
      );
    }

    // GeoJSON strictly uses [longitude, latitude] arrays
    const pt: [number, number] = [lng, lat];

    for (const feature of this.geojson.features) {
      if (!feature.geometry) continue;

      const { type, coordinates } = feature.geometry;
      let isInside = false;

      if (type === "Polygon") {
        isInside = this.isPointInPolygon(pt, coordinates);
      } else if (type === "MultiPolygon") {
        // MultiPolygons are arrays of Polygons. If it's inside ANY of them, it's a match.
        isInside = coordinates.some((poly: number[][][]) =>
          this.isPointInPolygon(pt, poly),
        );
      }

      if (isInside) {
        return feature.properties;
      }
    }

    return null; // Coordinate falls outside all known BC districts
  }

  private isPointInPolygon(
    point: [number, number],
    polygon: number[][][],
  ): boolean {
    // Must be inside the exterior ring (index 0)
    if (!this.rayCast(point, polygon[0])) return false;

    // Must NOT be inside any interior rings/holes (index 1+)
    for (let i = 1; i < polygon.length; i++) {
      if (this.rayCast(point, polygon[i])) return false;
    }

    return true;
  }

  private rayCast(point: [number, number], ring: number[][]): boolean {
    const [x, y] = point; // x = lng, y = lat
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0],
        yi = ring[i][1];
      const xj = ring[j][0],
        yj = ring[j][1];

      // Standard point-in-polygon math
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }

    return inside;
  }
}
