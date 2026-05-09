export interface AzureElectoralResult {
  "@search.score": number;
  id: string;
  street_alt_1: string;
  street_alt_2: string;
  street_full: string;
  street_addr: string;
  city: string;
  ed_abbr: string;
  ed_name: string;
  x: number;
  y: number;
}

export interface ValidatedAddress {
  street: string;
  city: string;
  province: string;
  postalCode: string | null;
  districtName: string;
  districtAbbr: string;
  coordinates: { lat: number; lng: number };
  isGoogleValidated: boolean;
  rawAzureData: AzureElectoralResult;
  rawGoogleData?: any;
}

export interface LookupConfig {
  maxResults?: number;
  googleApiKey?: string;
  searchUrl?: string;
  azureKey?: string;
  azureVersion?: string;
  onSelect?: (data: ValidatedAddress) => void;
}
