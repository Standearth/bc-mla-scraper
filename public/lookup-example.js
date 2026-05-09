const widget = new DistrictLookup.LookupWidget("#address-input", {
  // googleApiKey: "YOUR_GOOGLE_KEY_HERE",

  onSelect: (data) => {
    const resultCard = document.getElementById("result-card");
    const badge = document.getElementById("district-badge");
    const addressOutput = document.getElementById("address-output");
    const jsonDisplay = document.getElementById("raw-json");

    // 1. Populate the styled UI
    badge.textContent = `Electoral District: ${data.districtName}`;

    // Format the postal code cleanly (or leave blank if null)
    const postal = data.postalCode ? `<br>${data.postalCode}` : "";

    addressOutput.innerHTML = `
      <strong>${data.street}</strong><br>
      ${data.city}, ${data.province}${postal}
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
