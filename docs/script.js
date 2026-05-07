let mlaData = [];
let currentSort = { column: "constituencyName", direction: "asc" };

// Official BC Party Colors
const PARTY_COLORS = {
  CONSERVATIVE: "#004AAD",
  NDP: "#F4A460",
  GREEN: "#99C955",
  INDEPENDENT: "#7f8c8d",
};

/**
 * Cleans the raw party data into standardized categories.
 */
function getPartyInfo(mla) {
  const name = (mla.partyName || "").toUpperCase();
  const abbr = (mla.partyAbbreviation || "").toUpperCase();
  const combined = `${name} ${abbr}`;

  if (combined.includes("NDP") || combined.includes("NEW DEMOCRATIC PARTY")) {
    return { label: "NDP", color: PARTY_COLORS.NDP };
  }
  if (combined.includes("GREEN")) {
    return { label: "Green", color: PARTY_COLORS.GREEN };
  }
  if (combined.includes("CONSERVATIVE")) {
    return { label: "Conservative", color: PARTY_COLORS.CONSERVATIVE };
  }
  return { label: "Independent", color: PARTY_COLORS.INDEPENDENT };
}

async function init() {
  try {
    const response = await fetch("bc_mlas.json");
    mlaData = await response.json();

    document.getElementById("loading").style.display = "none";
    document.getElementById("mlaTable").style.display = "table";

    // Initial sort and render
    sortData("constituencyName", "asc");
  } catch (error) {
    document.getElementById("loading").innerText =
      "Error loading data. Please try again later.";
    console.error("Fetch error:", error);
  }
}

function renderTable(items) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = items
    .map((mla) => {
      const party = getPartyInfo(mla);

      // Handle missing emails gracefully
      const emailHtml = mla.email
        ? `<a href="mailto:${mla.email}" class="email-link">${mla.email}</a>`
        : `<span style="color: #999; font-size: 0.85em;">N/A</span>`;

      return `
          <tr>
              <td style="font-weight: 500;">${mla.constituencyName}</td>
              <td><img src="${mla.imagePath}" class="headshot" alt="${mla.firstName}"></td>
              <td>
                  <a href="${mla.profileUrl}" target="_blank" class="mla-name">
                      ${mla.firstName} ${mla.lastName}
                  </a>
              </td>
              <td>${emailHtml}</td>
              <td>
                  <span class="party-tag" style="background-color: ${party.color};">
                      ${party.label}
                  </span>
              </td>
          </tr>
      `;
    })
    .join("");
}

// --- Sorting Logic ---
function sortData(column, forceDirection = null) {
  // Toggle direction if clicking the same column, else default to ascending
  if (forceDirection) {
    currentSort.direction = forceDirection;
    currentSort.column = column;
  } else if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    currentSort.column = column;
    currentSort.direction = "asc";
  }

  const directionMod = currentSort.direction === "asc" ? 1 : -1;

  mlaData.sort((a, b) => {
    let valA = "";
    let valB = "";

    // Determine what values to compare based on the column
    if (column === "name") {
      // Sort names by Last Name, then First Name
      valA = (a.lastName + a.firstName).toLowerCase();
      valB = (b.lastName + b.firstName).toLowerCase();
    } else if (column === "partyAbbreviation") {
      valA = getPartyInfo(a).label;
      valB = getPartyInfo(b).label;
    } else {
      valA = (a[column] || "").toLowerCase();
      valB = (b[column] || "").toLowerCase();
    }

    if (valA < valB) return -1 * directionMod;
    if (valA > valB) return 1 * directionMod;
    return 0;
  });

  // Re-run the search filter so sorting doesn't clear the user's search
  triggerSearch();
  updateSortUI();
}

function updateSortUI() {
  // Remove sorting classes from all headers
  document.querySelectorAll("th.sortable").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
  });

  // Add the correct class to the currently sorted header
  const activeHeader = document.querySelector(
    `th[data-sort="${currentSort.column}"]`,
  );
  if (activeHeader) {
    activeHeader.classList.add(`sort-${currentSort.direction}`);
  }
}

// Add click listeners to all sortable headers
document.querySelectorAll("th.sortable").forEach((th) => {
  th.addEventListener("click", () => {
    sortData(th.dataset.sort);
  });
});

// --- Search Logic ---
function triggerSearch() {
  const term = document.getElementById("searchInput").value.toLowerCase();
  const filtered = mlaData.filter(
    (mla) =>
      (mla.firstName || "").toLowerCase().includes(term) ||
      (mla.lastName || "").toLowerCase().includes(term) ||
      (mla.constituencyName || "").toLowerCase().includes(term) ||
      (mla.email || "").toLowerCase().includes(term),
  );
  renderTable(filtered);
}

document.getElementById("searchInput").addEventListener("input", triggerSearch);

// Start the app
init();
