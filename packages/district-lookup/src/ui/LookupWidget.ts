import { ElectoralAPI } from "../core/ElectoralAPI";
import type { LookupConfig, AzureElectoralResult } from "../types";
import "./styles.css";

export class LookupWidget extends HTMLElement {
  private inputElement!: HTMLInputElement;
  private dropdownElement!: HTMLUListElement;
  private api!: ElectoralAPI;
  private _config: LookupConfig = {};

  // Track state for keyboard accessibility
  private currentResults: AzureElectoralResult[] = [];
  private activeIndex: number = -1;
  private originalInputText: string = "";
  private clearButton!: HTMLSpanElement;

  constructor() {
    super();
    this.api = new ElectoralAPI(this._config);
  }

  // Allow consumers to set config parameters (like API keys)
  set config(val: LookupConfig) {
    this._config = val;
    this.api = new ElectoralAPI(val);
  }

  get config() {
    return this._config;
  }

  connectedCallback() {
    const placeholder = this.getAttribute("placeholder") || "";

    this.innerHTML = `
      <div class="bcdl-wrapper">
        <input type="text" class="bcdl-input" placeholder="${placeholder}" autocomplete="off" />
        <span class="bcdl-clear" style="display: none;">&times;</span>
        <ul class="bcdl-dropdown" style="display: none;"></ul>
      </div>
    `;

    this.inputElement = this.querySelector("input") as HTMLInputElement;
    this.clearButton = this.querySelector(".bcdl-clear") as HTMLSpanElement;
    this.dropdownElement = this.querySelector("ul") as HTMLUListElement;

    this.bindEvents();
  }

  private debounce(func: Function, wait: number) {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  private bindEvents() {
    // 1. Text Input Event
    this.inputElement.addEventListener(
      "input",
      this.debounce(async (e: Event) => {
        const query = (e.target as HTMLInputElement).value;
        this.originalInputText = query;
        this.activeIndex = -1;

        // Toggle 'x' button visibility
        this.clearButton.style.display = query.length > 0 ? "flex" : "none";

        if (query.trim() === "") {
          this.currentResults = [];
          this.dropdownElement.style.display = "none";
          return;
        }

        const results = await this.api.searchAddress(query);
        this.currentResults = results || [];
        this.renderDropdown(this.currentResults);
      }, 300),
    );

    // 2. Click / Focus Events to Re-open Dropdown
    const openDropdown = () => {
      if (this.currentResults.length > 0) {
        this.dropdownElement.style.display = "block";
      }
    };
    this.inputElement.addEventListener("click", openDropdown);
    this.inputElement.addEventListener("focus", openDropdown);

    // 3. Keyboard Navigation Events
    this.inputElement.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        const isOpen = this.dropdownElement.style.display === "block";

        if (isOpen) {
          // First Escape: Revert to typed text and close dropdown
          this.inputElement.value = this.originalInputText;
          this.dropdownElement.style.display = "none";
          this.activeIndex = -1;
        } else {
          // Second Escape (Dropdown closed): Clear the field completely
          this.inputElement.value = "";
          this.originalInputText = "";
          this.currentResults = [];
          this.clearButton.style.display = "none";
        }
        return;
      }

      const items = this.dropdownElement.querySelectorAll("li");
      const isOpen = this.dropdownElement.style.display === "block";

      // Re-open on ArrowDown if closed
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen && items.length > 0) {
          this.dropdownElement.style.display = "block";
        }

        if (items.length > 0) {
          this.activeIndex++;
          if (this.activeIndex >= items.length) {
            this.activeIndex = 0;
          }
          this.updateActiveItem(items);
        }
        return;
      }

      // Prevent other keys from firing if dropdown is closed
      if (!isOpen || items.length === 0) {
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.activeIndex--;
        if (this.activeIndex < 0) {
          this.activeIndex = items.length - 1;
        }
        this.updateActiveItem(items);
      } else if (e.key === "Enter") {
        if (
          this.activeIndex > -1 &&
          this.activeIndex < this.currentResults.length
        ) {
          e.preventDefault();
          const item = this.currentResults[this.activeIndex];
          const streetLine = this.api.parseStreetOnly(
            item.street_addr,
            item.city,
          );
          this.handleSelection(item, streetLine);
        }
      }
    });

    // 4. Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.contains(e.target as Node)) {
        this.dropdownElement.style.display = "none";
      }
    });

    this.clearButton.addEventListener("click", () => {
      this.inputElement.value = "";
      this.originalInputText = "";
      this.currentResults = [];
      this.dropdownElement.style.display = "none";
      this.clearButton.style.display = "none";
      this.inputElement.focus();

      // Native Custom Event Broadcast
      this.dispatchEvent(new CustomEvent("cleared"));

      // Backwards compatibility if passing it via config
      if (this._config.onClear) {
        this._config.onClear();
      }
    });
  }

  private updateActiveItem(items: NodeListOf<HTMLLIElement>) {
    items.forEach((li, index) => {
      if (index === this.activeIndex) {
        li.classList.add("active");
        li.scrollIntoView({ block: "nearest" });

        const item = this.currentResults[this.activeIndex];
        const streetLine = this.api.parseStreetOnly(
          item.street_addr,
          item.city,
        );
        const fullText = `${streetLine}, ${item.city}`;

        this.inputElement.value = fullText;

        if (
          this.originalInputText &&
          fullText
            .toLowerCase()
            .startsWith(this.originalInputText.toLowerCase())
        ) {
          this.inputElement.setSelectionRange(
            this.originalInputText.length,
            fullText.length,
          );
        } else {
          this.inputElement.setSelectionRange(fullText.length, fullText.length);
        }
      } else {
        li.classList.remove("active");
      }
    });
  }

  private renderDropdown(results: AzureElectoralResult[]) {
    this.dropdownElement.innerHTML = "";

    if (!results || results.length === 0) {
      this.dropdownElement.style.display = "none";
      return;
    }

    results.forEach((item, index) => {
      const streetLine = this.api.parseStreetOnly(item.street_addr, item.city);
      const fullAddress = `${streetLine}, ${item.city}`;

      const li = document.createElement("li");

      li.innerHTML = `
        <div class="district-lookup-item-address">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#718096" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>
          </svg>
          <span title="${fullAddress}">${fullAddress}</span>
        </div>
        <small title="${item.ed_name}">${item.ed_name}</small>
      `;

      li.addEventListener("mouseenter", () => {
        this.activeIndex = index;
        const allItems = this.dropdownElement.querySelectorAll("li");
        allItems.forEach((i) => i.classList.remove("active"));
        li.classList.add("active");
      });

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
    this.inputElement.value = `${streetLine}, ${item.city}`;
    this.dropdownElement.style.display = "none";
    this.activeIndex = -1;
    this.inputElement.blur();

    const finalData = await this.api.getValidatedDetails(item);

    // Native Custom Event Broadcast
    this.dispatchEvent(
      new CustomEvent("district-selected", { detail: finalData }),
    );

    // Backwards compatibility
    if (this._config.onSelect) {
      this._config.onSelect(finalData);
    }
  }
}

// Automatically register the component
if (!customElements.get("bc-district-lookup")) {
  customElements.define("bc-district-lookup", LookupWidget);
}
