import { describe, it, expect, vi, beforeEach } from "vitest";
import { ElectoralAPI } from "./ElectoralAPI"; // Note the updated import path for colocation

// Mock the global fetch function
global.fetch = vi.fn();

describe("ElectoralAPI", () => {
  let api: ElectoralAPI;

  beforeEach(() => {
    api = new ElectoralAPI();
    vi.resetAllMocks();
  });

  describe("parseStreetOnly", () => {
    it("strips the city from the end of the address", () => {
      expect(api.parseStreetOnly("123 Fake St, Metropolis", "Metropolis")).toBe(
        "123 Fake St",
      );
    });

    it("handles case insensitivity", () => {
      expect(api.parseStreetOnly("456 Apple Rd, gotham", "Gotham")).toBe(
        "456 Apple Rd",
      );
    });
  });

  describe("searchAddress Sorting Logic", () => {
    it("strictly filters out addresses that do not contain all search tokens", async () => {
      const mockAzureResponse = {
        value: [
          {
            street_full: "1",
            street_addr: "123 West Maple St",
            city: "Metropolis",
            "@search.score": 100,
          },
          {
            street_full: "1",
            street_addr: "999 Oak Rd 123",
            city: "Gotham",
            "@search.score": 150,
          },
        ],
      };

      // @ts-ignore
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockAzureResponse,
      });

      // The user types "123 map"
      const results = await api.searchAddress("123 map");

      // The strict filter should completely drop "999 Oak Rd 123" because it lacks "map"
      expect(results.length).toBe(1);
      expect(results[0].street_addr).toBe("123 West Maple St");
    });

    it("prioritizes full unbroken strings over broken word matches", async () => {
      const mockAzureResponse = {
        value: [
          {
            street_full: "1",
            street_addr: "123 W Maple St",
            city: "Metropolis",
            "@search.score": 200,
          },
          {
            street_full: "1",
            street_addr: "123 Maple St",
            city: "Metropolis",
            "@search.score": 100,
          },
        ],
      };

      // @ts-ignore
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockAzureResponse,
      });

      // The user types "123 maple"
      const results = await api.searchAddress("123 maple");

      // "123 Maple St" should win because "123 maple" appears as an unbroken string
      expect(results[0].street_addr).toBe("123 Maple St");
    });

    it("prioritizes exact word matches over partial matches", async () => {
      const mockAzureResponse = {
        value: [
          {
            street_full: "1",
            street_addr: "500 Pine St",
            city: "Gotham",
            "@search.score": 50,
          },
          {
            street_full: "1",
            street_addr: "500 Pines Rd",
            city: "Gotham",
            "@search.score": 150,
          },
        ],
      };

      // @ts-ignore
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockAzureResponse,
      });

      // Both contain "500 pine" as a partial string, but "Pine St" has 2 exact words, "Pines" has 1.
      const results = await api.searchAddress("500 pine");

      // The algorithm correctly beats Azure's higher mock score
      expect(results[0].street_addr).toBe("500 Pine St");
    });
  });
});
