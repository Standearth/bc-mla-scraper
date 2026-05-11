const PARTY_COLORS = {
  Conservative: "#004AAD",
  NDP: "#F4A460",
  Green: "#99C955",
  Independent: "#7f8c8d",
};

const widget = new DistrictLookup.LookupWidget("#address-input", {
  // googleApiKey: "YOUR_GOOGLE_KEY_HERE",

  // Turn these on to test the full payloads
  returnRawAzure: true,
  returnRawGoogle: true,
  returnRawMla: true,

  onClear: () => {
    const resultCard = document.getElementById("result-card");
    if (resultCard) {
      resultCard.style.display = "none";
    }
  },

  onSelect: (data) => {
    const resultCard = document.getElementById("result-card");
    const addressOutput = document.getElementById("address-output");
    const mlaOutput = document.getElementById("mla-output");
    const jsonDisplay = document.getElementById("raw-json");

    // Format the postal code cleanly (or leave blank if null)
    const postal = data.postalCode ? `<br>${data.postalCode}` : "";

    // 1. Build the Top Section (Searched Address)
    addressOutput.innerHTML = `
      <div style="font-size: 0.85em; color: #64748b; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Searched Address</div>
      <strong>${data.street}</strong><br>
      ${data.city}, ${data.province}${postal}
    `;

    // 2. Build the Lower Section (MLA Profile)
    let mlaHtml = "";
    if (data.rawMlaData) {
      const mla = data.rawMlaData;
      const partyLabel = mla.partyAbbreviationClean || "Independent";
      const partyColor =
        PARTY_COLORS[partyLabel] || PARTY_COLORS["Independent"];

      // Handle dual emails if they are a minister
      const emailHtml = mla.ministryEmail
        ? `<a href="mailto:${mla.ministryEmail}">${mla.ministryEmail}</a> <span style="color:#64748b; font-size:0.9em;"></span><br>
           <a href="mailto:${mla.email}">${mla.email}</a> <span style="color:#64748b; font-size:0.9em;"></span>`
        : `<a href="mailto:${mla.email}">${mla.email}</a>`;

      // Handle optional toll-free number (With phone link and emoji)
      const tollFreeHtml = mla.conOfficeTollFreeClean
        ? `<br>📞 <a href="tel:${mla.conOfficeTollFree}">${mla.conOfficeTollFreeClean}</a> <span style="color:#64748b; font-size:0.9em;">(Toll Free)</span>`
        : "";

      // Format the Address exactly like the directory page (Suite-Street, NO spaces)
      const suiteStr = mla.conOfficeAddressCleanSuite
        ? `${mla.conOfficeAddressCleanSuite}-`
        : "";
      const streetStr =
        mla.conOfficeAddressCleanStreet ||
        mla.conOfficeAddress ||
        "Address not available";
      const formattedStreetLine = `${suiteStr}${streetStr}`;

      // Phone link and emoji
      const phoneHtml = mla.conOfficePhoneClean
        ? `📞 <a href="tel:${mla.conOfficePhone}">${mla.conOfficePhoneClean}</a>`
        : "N/A";

      mlaHtml = `
        <div class="district-header">Electoral District: ${data.districtName}</div>
        
        <div class="mla-profile">
          <img src="${mla.imagePath}" class="headshot" alt="${mla.firstName} ${mla.lastName}">
          <div class="mla-details">
            <div class="mla-header">
              <a href="${mla.profileUrl}" target="_blank" class="mla-name">
                <strong>${mla.firstName} ${mla.lastName}</strong>
              </a>
              <span class="party-tag" style="background-color: ${partyColor};">${partyLabel}</span>
            </div>
            
            <div class="mla-contact">
              ${emailHtml}
              
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1;">
                <div style="font-size: 0.85em; color: #64748b; margin-bottom: 4px; font-weight: 600; text-transform: uppercase;">Constituency Office</div>
                <div class="address-block">
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
      mlaHtml = `
         <div class="district-header">Electoral District: ${data.districtName}</div>
         <p style="color: #64748b; font-style: italic;">No representative data found for this district.</p>
       `;
    }

    mlaOutput.innerHTML = mlaHtml;

    // 3. Dump the raw data into the expandable details section
    jsonDisplay.textContent = JSON.stringify(data, null, 2);

    // Show the card
    resultCard.style.display = "block";
  },
});

// Hide the result card if the user starts typing a new address
document.getElementById("address-input").addEventListener("input", () => {
  document.getElementById("result-card").style.display = "none";
});
