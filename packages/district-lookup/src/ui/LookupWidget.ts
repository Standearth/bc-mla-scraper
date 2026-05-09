import { ElectoralAPI } from "../core/ElectoralAPI";
import type { LookupConfig, AzureElectoralResult } from "../types";
import "./styles.css";

export class LookupWidget {
  private inputElement: HTMLInputElement;
  private dropdownElement: HTMLUListElement;
  private api: ElectoralAPI;
  private config: LookupConfig;

  // Track state for keyboard accessibility
  private currentResults: AzureElectoralResult[] = [];
  private activeIndex: number = -1;
  private originalInputText: string = "";

  constructor(
    inputSelector: string | HTMLInputElement,
    config: LookupConfig = {},
  ) {
    this.config = config;
    this.api = new ElectoralAPI(config);

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

    this.dropdownElement = document.createElement("ul");
    this.dropdownElement.className = "district-lookup-dropdown";

    const wrapper = document.createElement("div");
    wrapper.className = "district-lookup-wrapper";
    this.inputElement.parentNode?.insertBefore(wrapper, this.inputElement);
    wrapper.appendChild(this.inputElement);
    wrapper.appendChild(this.dropdownElement);

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
        this.inputElement.value = this.originalInputText;
        this.dropdownElement.style.display = "none";
        this.activeIndex = -1;
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
      if (!this.inputElement.parentElement?.contains(e.target as Node)) {
        this.dropdownElement.style.display = "none";
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

      // Inject the Solid 18x18 Pointy Map Pin SVG
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

    if (this.config.onSelect) {
      this.config.onSelect(finalData);
    }
  }
}
