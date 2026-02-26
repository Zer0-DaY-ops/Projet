async function runSearch() {
  const query = document.getElementById("query").value;
  if (!query) return alert("Veuillez entrer un produit");

  // UI Reset
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

    const data = await response.json();
    const results = data.results;

    document.getElementById("loader").style.display = "none";

    if (results.length > 0) {
      renderPodium(results.slice(0, 3));
      renderCards(results.slice(3));
      document.getElementById("emailZone").style.display = "block";
    } else {
      alert("Aucun résultat trouvé.");
    }
  } catch (error) {
    console.error(error);
    document.getElementById("loader").style.display = "none";
    alert("Erreur lors de la recherche.");
  }
}

function renderPodium(top3) {
  const podiumCont = document.getElementById("podium-content");
  document.getElementById("podium-section").style.display = "block";
  podiumCont.innerHTML = "";

  const orders = [1, 0, 2]; // Pour mettre le 1er au milieu visuellement
  const classes = ["second", "first", "third"];

  orders.forEach((index) => {
    if (top3[index]) {
      const item = top3[index];
      podiumCont.innerHTML += `
                <div class="podium-item ${classes[index]}">
                    <div class="medal-badge medal-${index + 1}">${index + 1}</div>
                    <div class="store-badge" style="color:var(--primary); font-weight:bold">${item.site}</div>
                    <img src="${item.image}" class="product-img">
                    <div class="price-tag">${item.price}€</div>
                    <div style="font-size:0.8rem; margin-bottom:10px">${item.title.substring(0, 50)}...</div>
                    <a href="${item.link}" target="_blank" class="btn-main" style="text-decoration:none; display:inline-block">Voir</a>
                </div>
            `;
    }
  });
}

function renderCards(others) {
  const grid = document.getElementById("results");
  others.forEach((item) => {
    grid.innerHTML += `
            <div class="product-card">
                <span class="store-badge">${item.site}</span>
                <img src="${item.image}" class="product-img">
                <div class="price-tag">${item.price}€</div>
                <div style="font-size:0.9rem">${item.title.substring(0, 60)}...</div>
                <br>
                <a href="${item.link}" target="_blank" style="color:var(--primary); font-weight:bold">Accéder à l'offre →</a>
            </div>
        `;
  });
}

function handleEnter(e) {
  if (e.key === "Enter") runSearch();
}
