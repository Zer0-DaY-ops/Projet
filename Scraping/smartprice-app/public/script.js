let lastResults = [];

async function runSearch() {
  const query = document.getElementById("query").value.trim();
  if (!query) return;

  // Reset UI
  document.getElementById("loader").style.display = "block";
  document.getElementById("results").innerHTML = "";
  document.getElementById("podium-section").style.display = "none";
  document.getElementById("emailZone").style.display = "none";

  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    lastResults = await response.json();
    document.getElementById("loader").style.display = "none";

    if (lastResults.length === 0) {
      alert("Aucun résultat trouvé. Essayez une autre recherche.");
      return;
    }

    document.getElementById("emailZone").style.display = "block";
    renderPodium(lastResults.slice(0, 3));
    if (lastResults.length > 3) renderResults(lastResults.slice(3));
  } catch (e) {
    console.error(e);
    document.getElementById("loader").style.display = "none";
    alert("Erreur serveur.");
  }
}

function renderPodium(top3) {
  const container = document.getElementById("podium-content");
  container.innerHTML = "";
  document.getElementById("podium-section").style.display = "block";

  const order = [1, 0, 2]; // 2ème, 1er, 3ème
  order.forEach((index) => {
    const item = top3[index];
    if (!item) return;

    const rank = index + 1;
    const icon = rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉";
    const div = document.createElement("div");
    div.className = `podium-item ${rank === 1 ? "first" : rank === 2 ? "second" : "third"}`;
    div.innerHTML = `
            <div class="medal-badge medal-${rank}">${icon}</div>
            <img src="${item.image || ""}" class="product-img" onerror="this.src='https://placehold.co/120x120?text=Image'">
            <div style="font-weight:bold; color:var(--primary);">${item.site}</div>
            <div class="product-title">${item.title}</div>
            <div class="price-tag">${item.price}</div>
            <a href="${item.link}" target="_blank" class="btn-main" style="text-decoration:none; display:inline-block; font-size:0.9rem;">Voir l'offre</a>
        `;
    container.appendChild(div);
  });
}

function renderResults(others) {
  const grid = document.getElementById("results");
  others.forEach((item) => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
            <div style="font-weight:bold; color:var(--primary);">${item.site}</div>
            <img src="${item.image || ""}" class="product-img" onerror="this.src='https://placehold.co/120x120?text=Image'">
            <div class="product-title">${item.title}</div>
            <div class="price-tag" style="font-size:1.5rem;">${item.price}</div>
            <a href="${item.link}" target="_blank" style="color:var(--primary); font-weight:bold; text-decoration:none;">Acheter ➔</a>
        `;
    grid.appendChild(card);
  });
}

function handleEnter(e) {
  if (e.key === "Enter") runSearch();
}
