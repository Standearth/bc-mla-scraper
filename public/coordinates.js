const PARTY_COLORS = {
  Conservative: "#004AAD",
  NDP: "#F4A460",
  Green: "#99C955",
  Independent: "#7f8c8d",
};

document.addEventListener("DOMContentLoaded", async () => {
  const statusMsg = document.getElementById("status-message");
  const btnLookup = document.getElementById("btn-lookup");
  const btnGeolocation = document.getElementById("btn-geolocation");
  const latInput = document.getElementById("lat-input");
  const lngInput = document.getElementById("lng-input");

  const resultCard = document.getElementById("result-card");
  const addressOutput = document.getElementById("address-output");
  const mlaOutput = document.getElementById("mla-output");

  // 1. Initialize GeoLocator
  const locator = new DistrictLookup.GeoLocator();
  let mlaData = [];

  try {
    // 2. Load boundaries and MLA Directory data concurrently
    const [_, mlaRes] = await Promise.all([
      locator.load("./bc_electoral_districts.geojson"),
      fetch("./bc_mlas.json").then((res) => res.json()),
    ]);
    mlaData = mlaRes;

    statusMsg.style.display = "none";
    btnLookup.removeAttribute("disabled");
    btnGeolocation.removeAttribute("disabled");

    // 3. Check for URL parameters (e.g. ?lat=48.4196&lng=-123.3702)
    const params = new URLSearchParams(window.location.search);
    const urlLat = params.get("lat");
    const urlLng = params.get("lng");

    if (urlLat && urlLng) {
      latInput.value = urlLat;
      lngInput.value = urlLng;
      performLookup(parseFloat(urlLat), parseFloat(urlLng));
    }
  } catch (err) {
    statusMsg.innerText = "❌ Failed to load boundary or MLA data.";
    console.error(err);
  }

  // Event: Manual Search Click
  btnLookup.addEventListener("click", () => {
    const lat = parseFloat(latInput.value);
    const lng = parseFloat(lngInput.value);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid latitude and longitude numbers.");
      return;
    }
    performLookup(lat, lng);
  });

  // Events: Sample Links
  document.getElementById("sample-leg").addEventListener("click", (e) => {
    e.preventDefault();
    latInput.value = "48.4196";
    lngInput.value = "-123.3702";
    performLookup(48.4196, -123.3702);
  });

  document.getElementById("sample-van").addEventListener("click", (e) => {
    e.preventDefault();
    latInput.value = "49.2606";
    lngInput.value = "-123.1139";
    performLookup(49.2606, -123.1139);
  });

  document.getElementById("sample-pg").addEventListener("click", (e) => {
    e.preventDefault();
    latInput.value = "53.9171";
    lngInput.value = "-122.7497";
    performLookup(53.9171, -122.7497);
  });

  // Event: Geolocation Click
  btnGeolocation.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    btnGeolocation.innerText = "Locating...";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        latInput.value = lat;
        lngInput.value = lng;

        performLookup(lat, lng);
        btnGeolocation.innerText = "📍 Use My Location";
      },
      (error) => {
        alert(`Error getting location: ${error.message}`);
        btnGeolocation.innerText = "📍 Use My Location";
      },
    );
  });

  // Main Lookup and Rendering Function
  function performLookup(lat, lng) {
    const districtProps = locator.findDistrict(lat, lng);

    // If outside BC boundaries
    if (!districtProps) {
      addressOutput.innerHTML = `
        <div style="font-size: 0.85em; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Searched Coordinates</div>
        <strong>${lat}, ${lng}</strong><br>
        <span style="color:#e11d48;">Coordinate falls outside of British Columbia</span>
      `;
      mlaOutput.innerHTML = `<p style="color: #64748b; font-style: italic;">No representative data found for these coordinates.</p>`;
      resultCard.style.display = "block";
      return;
    }

    const districtName = districtProps.ED_NAME;
    const districtAbbr = districtProps.ED_ABBREVIATION;

    // Output Header
    addressOutput.innerHTML = `
      <div style="font-size: 0.85em; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Searched Coordinates</div>
      <strong>${lat}, ${lng}</strong>
    `;

    // Find corresponding MLA
    const mla = mlaData.find((m) => m.districtCode === districtAbbr);

    if (mla) {
      const partyLabel = mla.partyAbbreviationClean || "Independent";
      const partyColor =
        PARTY_COLORS[partyLabel] || PARTY_COLORS["Independent"];

      const emailHtml = mla.ministryEmail
        ? `<a href="mailto:${mla.ministryEmail}">${mla.ministryEmail}</a><br>
           <a href="mailto:${mla.email}">${mla.email}</a>`
        : `<a href="mailto:${mla.email}">${mla.email}</a>`;

      const tollFreeHtml = mla.conOfficeTollFreeClean
        ? `<br>📞 <a href="tel:${mla.conOfficeTollFree}">${mla.conOfficeTollFreeClean}</a> <span style="color:#64748b; font-size:0.9em;">(Toll Free)</span>`
        : "";

      const suiteStr = mla.conOfficeAddressCleanSuite
        ? `${mla.conOfficeAddressCleanSuite}-`
        : "";
      const streetStr =
        mla.conOfficeAddressCleanStreet ||
        mla.conOfficeAddress ||
        "Address not available";
      const formattedStreetLine = `${suiteStr}${streetStr}`;

      const phoneHtml = mla.conOfficePhoneClean
        ? `📞 <a href="tel:${mla.conOfficePhone}">${mla.conOfficePhoneClean}</a>`
        : "N/A";

      // Same HTML block as lookup.js to ensure visual parity
      mlaOutput.innerHTML = `
        <div class="bcdl-district-header">Electoral District: ${districtName}</div>
        
        <div class="bcdl-mla-profile">
          <img src="${mla.imagePath}" class="bcdl-headshot" alt="${mla.firstName} ${mla.lastName}">
          <div class="bcdl-mla-details">
            <div class="bcdl-mla-header">
              <a href="${mla.profileUrl}" target="_blank" class="bcdl-mla-name">
                <strong>${mla.firstName} ${mla.lastName}</strong>
              </a>
              <span class="bcdl-party-tag" style="background-color: ${partyColor};">${partyLabel}</span>
            </div>
            
            <div class="bcdl-mla-contact">
              ${emailHtml}
              
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                <div style="font-size: 0.85em; color: #64748b; margin-bottom: 4px; font-weight: 600; text-transform: uppercase;">Constituency Office</div>
                <div class="bcdl-address-block">
                  ${formattedStreetLine}<br>
                  ${mla.conOfficeCity}, BC<br>
                  ${mla.conOfficePostalCode}
                </div>
                
                <div style="margin-top: 8px;">
                  ${phoneHtml}${tollFreeHtml}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      mlaOutput.innerHTML = `
        <div class="bcdl-district-header">Electoral District: ${districtName}</div>
        <p style="color: #64748b; font-style: italic;">No representative data found for this district.</p>
      `;
    }

    resultCard.style.display = "block";
  }
});
