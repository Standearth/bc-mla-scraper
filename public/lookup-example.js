const widget = new DistrictLookup.LookupWidget("#address-input", {
  // googleApiKey: "YOUR_GOOGLE_KEY_HERE",

  // Turn these on to test the full payloads
  returnRawAzure: true,
  returnRawGoogle: true,
  returnRawMla: true,

  onSelect: (data) => {
    const resultCard = document.getElementById("result-card");
    const badge = document.getElementById("district-badge");
    const addressOutput = document.getElementById("address-output");
    const jsonDisplay = document.getElementById("raw-json");

    // 1. Populate the styled UI
    badge.textContent = `Electoral District: ${data.districtName}`;

    // Format the postal code cleanly (or leave blank if null)
    const postal = data.postalCode ? `<br>${data.postalCode}` : "";

    // Build the MLA block if the match was successful
    let mlaHtml = "";
    if (data.mla) {
      mlaHtml = `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee;">
          <div style="font-size: 0.9em; color: #666; margin-bottom: 5px;">Current Representative:</div>
          <strong>${data.mla.firstName} ${data.mla.lastName}</strong> (${data.mla.partyAbbr})<br>
          <a href="mailto:${data.mla.email}">${data.mla.email}</a><br>
          ${data.mla.phone}
        </div>
      `;
    }

    addressOutput.innerHTML = `
      <strong>${data.street}</strong><br>
      ${data.city}, ${data.province}${postal}
      ${mlaHtml}
    `;

    // 2. Dump the raw data into the expandable details section
    jsonDisplay.textContent = JSON.stringify(data, null, 2);

    // Show the card
    resultCard.style.display = "block";
  },
});

// Hide the result card if the user starts typing a new address
document.getElementById("address-input").addEventListener("input", () => {
  document.getElementById("result-card").style.display = "none";
});
