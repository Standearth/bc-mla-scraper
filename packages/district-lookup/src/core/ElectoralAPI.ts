import type {
  AzureElectoralResult,
  ValidatedAddress,
  LookupConfig,
} from "../types";

export class ElectoralAPI {
  private config: LookupConfig;
  private searchUrl: string;
  private azureKey: string;
  private azureVersion: string;

  constructor(config: LookupConfig = {}) {
    this.config = { maxResults: 25, ...config };

    // Use config overrides if provided, otherwise fall back to .env variables
    this.searchUrl = this.config.searchUrl || import.meta.env.VITE_SEARCH_URL;
    this.azureKey = this.config.azureKey || import.meta.env.VITE_AZURE_KEY;
    this.azureVersion =
      this.config.azureVersion || import.meta.env.VITE_AZURE_VERSION;

    if (!this.searchUrl || !this.azureKey) {
      console.warn("DistrictLookup: Missing Azure Search credentials.");
    }
  }

  public parseStreetOnly(fullAddr: string, city: string): string {
    if (!fullAddr) return "";
    const cityRegex = new RegExp(",\\s*" + city + "$", "i");
    return fullAddr.replace(cityRegex, "").trim();
  }

  private countExactWords(address: string, tokens: string[]): number {
    const addrWords = address.toLowerCase().split(/[\s,.]+/);
    return tokens.filter((token) => addrWords.includes(token)).length;
  }

  public async searchAddress(query: string): Promise<AzureElectoralResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const queryLower = trimmedQuery.toLowerCase();
    const queryTokens = queryLower
      .split(/\s+/)
      .filter((token) => token.length > 0);

    const searchTerms = queryTokens.map((token) => token + "*").join(" ");
    const searchQuery = encodeURIComponent(searchTerms);

    const url = `${this.searchUrl}?api-version=${this.azureVersion}&search=${searchQuery}&$top=${this.config.maxResults}&api-key=${this.azureKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Azure Search Error: ${response.status}`);
      const data = await response.json();

      const filteredResults = data.value.filter(
        (item: AzureElectoralResult) => {
          if (!item.street_full) return false;
          const addrLower = item.street_addr.toLowerCase();
          return queryTokens.every((token) => addrLower.includes(token));
        },
      );

      return filteredResults.sort(
        (a: AzureElectoralResult, b: AzureElectoralResult) => {
          const aAddr = a.street_addr.toLowerCase();
          const bAddr = b.street_addr.toLowerCase();

          const aExactWordCount = this.countExactWords(aAddr, queryTokens);
          const bExactWordCount = this.countExactWords(bAddr, queryTokens);

          if (aExactWordCount !== bExactWordCount) {
            return bExactWordCount - aExactWordCount;
          }

          const aExact = aAddr.includes(queryLower);
          const bExact = bAddr.includes(queryLower);

          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;

          return b["@search.score"] - a["@search.score"];
        },
      );
    } catch (error) {
      console.error("Error fetching electoral addresses:", error);
      return [];
    }
  }

  public async getValidatedDetails(
    azureResult: AzureElectoralResult,
  ): Promise<ValidatedAddress> {
    const rawStreet = this.parseStreetOnly(
      azureResult.street_addr,
      azureResult.city,
    );

    const baseResult: ValidatedAddress = {
      street: rawStreet,
      city: azureResult.city,
      province: "BC",
      postalCode: null,
      districtName: azureResult.ed_name,
      districtAbbr: azureResult.ed_abbr,
      coordinates: { lat: azureResult.y, lng: azureResult.x },
      isGoogleValidated: false,
      rawAzureData: azureResult,
    };

    if (!this.config.googleApiKey) return baseResult;

    try {
      const googleUrl = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${this.config.googleApiKey}`;
      const payload = {
        address: {
          regionCode: "CA",
          locality: azureResult.city,
          addressLines: [rawStreet],
        },
      };

      const response = await fetch(googleUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Google Validation API Error");
      const data = await response.json();

      const postalCodeComponent =
        data.result?.address?.postalAddress?.postalCode;

      if (postalCodeComponent) {
        baseResult.postalCode = postalCodeComponent;
        baseResult.isGoogleValidated = true;
      }

      return baseResult;
    } catch (error) {
      console.warn(
        "Google Validation failed, falling back to base Azure data.",
        error,
      );
      return baseResult;
    }
  }
}
