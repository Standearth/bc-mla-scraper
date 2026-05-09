import { ElectoralAPI } from "../core/ElectoralAPI";
import type { LookupConfig, AzureElectoralResult } from "../types";

export class LookupWidget {
  private inputElement: HTMLInputElement;
  private dropdownElement: HTMLUListElement;
  private api: ElectoralAPI;
  private config: LookupConfig;

  constructor(
    inputSelector: string | HTMLInputElement,
    config: LookupConfig = {},
  ) {
    this.config = config;
    this.api = new ElectoralAPI(config);

    // Resolve the input element
    const el =
      typeof inputSelector === "string"
        ? document.querySelector(inputSelector)
        : inputSelector;
    if (!el || !(el instanceof HTMLInputElement)) {
      throw new Error(
        `DistrictLookup: Could not find input element for selector: ${inputSelector}`,
      );
    }
    this.inputElement = el;

    // Build the dropdown DOM
    this.dropdownElement = document.createElement("ul");
    this.setupStyles();

    // Wrap the input in a relative container so the absolute dropdown positions correctly
    const wrapper = document.createElement("div");
    wrapper.className = "district-lookup-wrapper";
    this.inputElement.parentNode?.insertBefore(wrapper, this.inputElement);
    wrapper.appendChild(this.inputElement);
    wrapper.appendChild(this.dropdownElement);

    this.bindEvents();
  }

  private setupStyles() {
    this.dropdownElement.className = "district-lookup-dropdown";
    const styleId = "district-lookup-styles";

    // Only inject styles once per page
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        .district-lookup-wrapper { position: relative; width: 100%; }
        .district-lookup-dropdown {
          position: absolute; top: 100%; left: 0; right: 0;
          background: white; border: 1px solid #ccc; border-top: none;
          border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          max-height: 300px; overflow-y: auto; z-index: 1000;
          display: none; margin: 0; padding: 0; list-style: none;
        }
        .district-lookup-dropdown li {
          padding: 12px 15px; cursor: pointer; border-bottom: 1px solid #eee;
          display: flex; justify-content: space-between; align-items: center;
          font-family: system-ui, sans-serif;
        }
        .district-lookup-dropdown li:last-child { border-bottom: none; }
        .district-lookup-dropdown li:hover { background-color: #ebf8ff; }
        .district-lookup-dropdown li strong { color: #2b6cb0; }
        .district-lookup-dropdown li small {
          color: #666; background: #f0f4f8; padding: 2px 6px; border-radius: 4px;
        }
      `;
      document.head.appendChild(style);
    }
  }

  private debounce(func: Function, wait: number) {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  private bindEvents() {
    this.inputElement.addEventListener(
      "input",
      this.debounce(async (e: Event) => {
        const query = (e.target as HTMLInputElement).value;
        const results = await this.api.searchAddress(query);
        this.renderDropdown(results);
      }, 300),
    );

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.inputElement.parentElement?.contains(e.target as Node)) {
        this.dropdownElement.style.display = "none";
      }
    });
  }

  private renderDropdown(results: AzureElectoralResult[]) {
    this.dropdownElement.innerHTML = "";

    if (!results || results.length === 0) {
      this.dropdownElement.style.display = "none";
      return;
    }

    results.forEach((item) => {
      const streetLine = this.api.parseStreetOnly(item.street_addr, item.city);
      const li = document.createElement("li");
      li.innerHTML = `<span><strong>${streetLine}</strong></span><small>${item.city}</small>`;

      li.addEventListener("click", () =>
        this.handleSelection(item, streetLine),
      );
      this.dropdownElement.appendChild(li);
    });

    this.dropdownElement.style.display = "block";
  }

  private async handleSelection(
    item: AzureElectoralResult,
    streetLine: string,
  ) {
    // Optimistically update the UI so it feels snappy
    this.inputElement.value = `${streetLine}, ${item.city}`;
    this.dropdownElement.style.display = "none";

    // Fetch the enriched data (Google validation happens here if a key was provided)
    const finalData = await this.api.getValidatedDetails(item);

    // Fire the callback
    if (this.config.onSelect) {
      this.config.onSelect(finalData);
    }
  }
}
