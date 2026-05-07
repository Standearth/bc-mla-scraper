let mlaData = [];
let currentSort = { column: "constituencyId", direction: "asc" };
let isRawView = false;

const PARTY_COLORS = {
  CONSERVATIVE: "#004AAD",
  NDP: "#F4A460",
  GREEN: "#99C955",
  INDEPENDENT: "#7f8c8d",
};

function getPartyInfo(mla) {
  const name = (mla.partyName || "").toUpperCase();
  const abbr = (mla.partyAbbreviation || "").toUpperCase();
  const combined = `${name} ${abbr}`;

  if (combined.includes("NDP") || combined.includes("NEW DEMOCRATIC PARTY"))
    return { label: "NDP", color: PARTY_COLORS.NDP };
  if (combined.includes("GREEN"))
    return { label: "Green", color: PARTY_COLORS.GREEN };
  if (combined.includes("CONSERVATIVE"))
    return { label: "Conservative", color: PARTY_COLORS.CONSERVATIVE };
  return { label: "Independent", color: PARTY_COLORS.INDEPENDENT };
}

function formatPhone(phoneStr) {
  if (!phoneStr) return null;
  try {
    if (typeof libphonenumber !== "undefined") {
      const parsed = libphonenumber.parsePhoneNumberFromString(
        String(phoneStr),
        "CA",
      );
      if (parsed && parsed.isValid()) {
        return parsed.formatNational();
      }
    }
  } catch (e) {
    console.warn("Error formatting phone:", e);
  }
  return phoneStr;
}

async function init() {
  try {
    const response = await fetch("bc_mlas.json");
    mlaData = await response.json();
    document.getElementById("loading").style.display = "none";
    document.getElementById("tableArea").style.display = "block";
    sortData("constituencyId", "asc");
  } catch (error) {
    document.getElementById("loading").innerText = "Error loading data.";
    console.error(error);
  }
}

function renderTable(items) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = items
    .map((mla, index) => {
      const party = getPartyInfo(mla);

      const emailHtml = mla.email
        ? `<a href="mailto:${mla.email}" class="email-link">${mla.email}</a>`
        : ``;

      const rolesHtml = mla.roles
        ? `<p><strong>Roles:</strong> ${mla.roles}</p>`
        : "";
      const electedHtml = mla.electionYears
        ? `<p><strong>Elected:</strong> ${mla.electionYears}</p>`
        : "";

      const conAddress = mla.conOfficeAddress
        ? `<p>${mla.conOfficeAddress}</p>`
        : "";
      const conCityProv = mla.conOfficeCity
        ? `<p>${mla.conOfficeCity}, BC</p>`
        : "";
      const conPostal = mla.conOfficePostalCode
        ? `<p>${mla.conOfficePostalCode}</p>`
        : "";
      const conPhone = formatPhone(mla.conOfficePhone);
      const conPhoneHtml = conPhone ? `<p>📞 ${conPhone}</p>` : "";
      const conFax = formatPhone(mla.conOfficeFax);
      const conFaxHtml = conFax ? `<p>📠 ${conFax}</p>` : "";

      const legAddress = mla.legBuildingAddress
        ? `<p>${mla.legBuildingAddress}</p>`
        : "";
      const legCityProv = mla.legBuildingCity
        ? `<p>${mla.legBuildingCity}, BC</p>`
        : "";
      const legPostal = mla.legBuildingPostalCode
        ? `<p>${mla.legBuildingPostalCode}</p>`
        : "";
      const legPhone = formatPhone(mla.legOfficePhone);
      const legPhoneHtml = legPhone ? `<p>📞 ${legPhone}</p>` : "";
      const legFax = formatPhone(mla.legOfficeFax);
      const legFaxHtml = legFax ? `<p>📠 ${legFax}</p>` : "";

      return `
          <tr class="expandable-row" id="row-${index}" onclick="toggleDetails(${index})">
              <td style="font-weight: 500;">
                  <span class="chevron" id="chevron-${index}">▼</span> 
                  &nbsp;${mla.constituencyName}
              </td>
              <td><img src="${mla.imagePath}" class="headshot" alt="${mla.firstName}"></td>
              <td>
                  <a href="${mla.profileUrl}" target="_blank" class="mla-name" onclick="event.stopPropagation()">
                      ${mla.firstName} ${mla.lastName}
                  </a>
              </td>
              <td onclick="event.stopPropagation()">${emailHtml}</td>
              <td>
                  <span class="party-tag" style="background-color: ${party.color};">
                      ${party.label}
                  </span>
              </td>
          </tr>
          <tr id="details-${index}" class="details-row" style="display: none;">
              <td colspan="5">
                  <div class="details-content">
                      <div class="detail-card">
                          <h4>Background</h4>
                          ${rolesHtml}
                          ${electedHtml}
                          <p><a href="${mla.profileUrl}" target="_blank">View Profile ↗</a></p>
                      </div>
                      
                      <div class="detail-card">
                          <h4>Constituency Office</h4>
                          ${conAddress || (conCityProv ? "" : "<p>Address not listed</p>")}
                          ${conCityProv}
                          ${conPostal}
                          ${conPhoneHtml}
                          ${conFaxHtml}
                      </div>

                      <div class="detail-card">
                          <h4>Legislature Office</h4>
                          ${legAddress}
                          ${legCityProv}
                          ${legPostal}
                          ${legPhoneHtml}
                          ${legFaxHtml}
                      </div>
                  </div>
              </td>
          </tr>
      `;
    })
    .join("");
  updateToggleButtons();
}

function toggleViewMode() {
  isRawView = !isRawView;
  const btn = document.getElementById("viewToggle");
  const searchInput = document.getElementById("searchInput");
  const downloadButtons = document.getElementById("downloadButtons");
  const headerActions = document.getElementById("headerActions");
  const controls = document.getElementById("controls");
  const actionButtons = document.getElementById("actionButtons");

  if (isRawView) {
    btn.innerHTML = "🏛️ View Directory";
    document.body.classList.add("raw-mode");
    document.getElementById("directoryWrapper").style.display = "none";
    document.getElementById("rawWrapper").style.display = "block";
    document.getElementById("intro").style.display = "none";
    document.getElementById("mainFooter").style.display = "none";
    document.getElementById("btnExpandAll").style.display = "none";
    document.getElementById("btnCollapseAll").style.display = "none";
    headerActions.appendChild(searchInput);
    headerActions.appendChild(downloadButtons);
    headerActions.appendChild(btn);
  } else {
    btn.innerHTML = "🗄️ View Raw Data";
    document.body.classList.remove("raw-mode");
    document.getElementById("directoryWrapper").style.display = "block";
    document.getElementById("rawWrapper").style.display = "none";
    document.getElementById("intro").style.display = "block";
    document.getElementById("mainFooter").style.display = "block";
    document.getElementById("btnExpandAll").style.display = "inline-flex";
    document.getElementById("btnCollapseAll").style.display = "inline-flex";
    controls.prepend(searchInput);
    controls.appendChild(downloadButtons);
    actionButtons.appendChild(btn);
  }
  triggerSearch();
}

function renderRawTable(items) {
  const thead = document.getElementById("rawTableHead");
  const tbody = document.getElementById("rawTableBody");
  if (!items.length) {
    tbody.innerHTML = "<tr><td>No results found</td></tr>";
    return;
  }
  const keys = Object.keys(items[0]);

  thead.innerHTML = `<tr>${keys.map((k) => `<th class="sortable" onclick="sortData('${k}')" data-sort="${k}">${k} <span class="sort-icon"></span></th>`).join("")}</tr>`;

  tbody.innerHTML = items
    .map(
      (item) =>
        `<tr>${keys.map((k) => `<td>${item[k] === null ? "" : item[k]}</td>`).join("")}</tr>`,
    )
    .join("");
}

function triggerSearch() {
  const term = document.getElementById("searchInput").value.toLowerCase();

  const filtered = mlaData.filter(
    (mla) =>
      (mla.firstName || "").toLowerCase().includes(term) ||
      (mla.lastName || "").toLowerCase().includes(term) ||
      (mla.constituencyName || "").toLowerCase().includes(term) ||
      (mla.roles || "").toLowerCase().includes(term) ||
      (mla.email || "").toLowerCase().includes(term),
  );

  if (isRawView) renderRawTable(filtered);
  else renderTable(filtered);

  // Ensure the sort arrows persist after the DOM is redrawn by a search or view toggle
  if (typeof updateSortUI === "function") {
    updateSortUI();
  }
}

function sortData(column, forceDirection = null) {
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

    if (column === "name") {
      valA = (a.lastName + a.firstName).toLowerCase();
      valB = (b.lastName + b.firstName).toLowerCase();
    } else if (column === "partyAbbreviation") {
      valA = getPartyInfo(a).label;
      valB = getPartyInfo(b).label;
    } else {
      valA = a[column];
      valB = b[column];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
    }

    if (valA == null) valA = "";
    if (valB == null) valB = "";

    if (valA < valB) return -1 * directionMod;
    if (valA > valB) return 1 * directionMod;
    return 0;
  });

  triggerSearch();
  updateSortUI();
}

function updateSortUI() {
  document.querySelectorAll("th.sortable").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
  });

  // Apply sort styles to matching headers
  document
    .querySelectorAll(`th[data-sort="${currentSort.column}"]`)
    .forEach((th) => {
      th.classList.add(`sort-${currentSort.direction}`);
    });
}

function expandAll() {
  document
    .querySelectorAll(".details-row")
    .forEach((row) => (row.style.display = "table-row"));
  document
    .querySelectorAll(".expandable-row")
    .forEach((row) => row.classList.add("expanded-row"));

  document
    .querySelectorAll(".chevron")
    .forEach((chevron) => (chevron.innerText = "▲"));
  updateToggleButtons();
}

function collapseAll() {
  document
    .querySelectorAll(".details-row")
    .forEach((row) => (row.style.display = "none"));
  document
    .querySelectorAll(".expandable-row")
    .forEach((row) => row.classList.remove("expanded-row"));

  document
    .querySelectorAll(".chevron")
    .forEach((chevron) => (chevron.innerText = "▼"));
  updateToggleButtons();
}

function toggleDetails(index) {
  const detailsRow = document.getElementById(`details-${index}`);
  const mainRow = document.getElementById(`row-${index}`);
  const chevron = document.getElementById(`chevron-${index}`);

  if (detailsRow.style.display === "none") {
    detailsRow.style.display = "table-row";
    mainRow.classList.add("expanded-row");
    if (chevron) chevron.innerText = "▲";
  } else {
    detailsRow.style.display = "none";
    mainRow.classList.remove("expanded-row");
    if (chevron) chevron.innerText = "▼";
  }
  updateToggleButtons();
}

function updateToggleButtons() {
  const btnExpand = document.getElementById("btnExpandAll");
  const btnCollapse = document.getElementById("btnCollapseAll");

  if (!btnExpand || !btnCollapse) return;

  const totalRows = document.querySelectorAll(".expandable-row").length;
  const expandedRows = document.querySelectorAll(".expanded-row").length;

  if (totalRows === 0) {
    btnExpand.disabled = true;
    btnCollapse.disabled = true;
  } else {
    btnExpand.disabled = expandedRows === totalRows;
    btnCollapse.disabled = expandedRows === 0;
  }
}

// Bind sorting to directory column headers
document.querySelectorAll("th.sortable").forEach((th) => {
  th.addEventListener("click", () => sortData(th.dataset.sort));
});

document.getElementById("searchInput").addEventListener("input", triggerSearch);
init();
