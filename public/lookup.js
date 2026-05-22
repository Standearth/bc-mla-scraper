const PARTY_COLORS = {
  Conservative: "#004AAD",
  NDP: "#F4A460",
  Green: "#99C955",
  Independent: "#7f8c8d",
};

// Target the new Web Component
const lookupWidget = document.getElementById("district-lookup");

// Set config properties
lookupWidget.config = {
  // googleApiKey: "YOUR_GOOGLE_KEY_HERE",
  returnRawAzure: true,
  returnRawGoogle: true,
  returnRawMla: true,
};

// Native Event Listener for cleared state
lookupWidget.addEventListener("cleared", () => {
  const resultCard = document.getElementById("result-card");
  if (resultCard) {
    resultCard.style.display = "none";
  }
});

// Native Event Listener for successful lookups
lookupWidget.addEventListener("district-selected", (e) => {
  const data = e.detail; // Extract emitted data payload
  const resultCard = document.getElementById("result-card");
  const addressOutput = document.getElementById("address-output");
  const mlaOutput = document.getElementById("mla-output");
  const jsonDisplay = document.getElementById("raw-json");

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
    const partyLabel = mla.partyAbbreviation || "Independent";
    const partyColor = PARTY_COLORS[partyLabel] || PARTY_COLORS["Independent"];

    const emailHtml = mla.ministryEmail
      ? `<a href="mailto:${mla.ministryEmail}">${mla.ministryEmail}</a> <span style="color:#64748b; font-size:0.9em;"></span><br>
         <a href="mailto:${mla.email}">${mla.email}</a> <span style="color:#64748b; font-size:0.9em;"></span>`
      : `<a href="mailto:${mla.email}">${mla.email}</a>`;

    const tollFreeHtml = mla.conOfficeTollFree
      ? `<br>📞 <a href="tel:${mla.conOfficeTollFreeRaw}">${mla.conOfficeTollFree}</a> <span style="color:#64748b; font-size:0.9em;">(Toll Free)</span>`
      : "";

    const suiteStr = mla.conOfficeSuite ? `${mla.conOfficeSuite}-` : "";
    const streetStr =
      mla.conOfficeStreet || mla.conOfficeAddressRaw || "Address not available";
    const formattedStreetLine = `${suiteStr}${streetStr}`;

    const phoneHtml = mla.conOfficePhone
      ? `📞 <a href="tel:${mla.conOfficePhoneRaw}">${mla.conOfficePhone}</a>`
      : "";

    mlaHtml = `
        <div class="bcdl-district-header">Electoral District: ${data.districtName}</div>
        
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
    mlaHtml = `
       <div class="district-header">Electoral District: ${data.districtName}</div>
       <p style="color: #64748b; font-style: italic;">No representative data found for this district.</p>
     `;
  }

  mlaOutput.innerHTML = mlaHtml;
  jsonDisplay.textContent = JSON.stringify(data, null, 2);
  resultCard.style.display = "block";
});

// Hide the result card if the user starts typing a new address
// Since native text input events bubble up out of the web component, we can listen for "input" straight on the custom tag!
lookupWidget.addEventListener("input", () => {
  const resultCard = document.getElementById("result-card");
  if (resultCard) {
    resultCard.style.display = "none";
  }
});
