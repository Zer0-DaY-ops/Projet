const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartPrice | Comparateur de prix intelligent</title>
    <style>
        :root { --primary: #2563eb; --secondary: #7c3aed; --success: #10b981; --bg: #f8fafc; --text: #1e293b; --card: #ffffff; --gold: #f59e0b; --silver: #94a3b8; --bronze: #b45309; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; background: var(--bg); margin: 0; padding: 20px; color: var(--text); }
        .container { max-width: 1100px; margin: 0 auto; }
        .card-main { background: var(--card); padding: 60px 40px; border-radius: 30px; box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1); text-align: center; border: 1px solid #e2e8f0; margin-bottom: 30px; }
        h1 { font-size: 3.5rem; margin: 0; font-weight: 900; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { color: #64748b; font-size: 1.2rem; margin-top: 10px; margin-bottom: 30px; }
        .search-bar { display: flex; gap: 10px; background: #f1f5f9; padding: 12px; border-radius: 25px; border: 2px solid transparent; transition: 0.3s; max-width: 750px; margin: 0 auto; }
        .search-bar:focus-within { border-color: var(--primary); background: white; box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.1); }
        input { flex: 1; border: none; background: transparent; padding: 15px 25px; font-size: 1.2rem; outline: none; }
        .btn-main { background: var(--primary); color: white; border: none; padding: 15px 40px; border-radius: 18px; font-weight: 800; font-size: 1.1rem; cursor: pointer; transition: 0.2s; }
        .btn-main:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25); }

        #podium-section { display: none; margin: 50px 0; animation: slideUp 0.6s ease-out; }
        .podium-container { display: flex; align-items: flex-end; justify-content: center; gap: 15px; padding-top: 40px; min-height: 400px; }
        .podium-item { background: white; border-radius: 24px; padding: 25px; text-align: center; border: 2px solid #e2e8f0; position: relative; flex: 1; max-width: 300px; transition: 0.3s; }
        .podium-item.first { height: 450px; border-color: var(--gold); transform: translateY(-20px); box-shadow: 0 20px 40px rgba(245, 158, 11, 0.15); }
        .podium-item.second { height: 380px; border-color: var(--silver); }
        .podium-item.third { height: 340px; border-color: var(--bronze); }
        .medal-badge { position: absolute; top: -25px; left: 50%; transform: translateX(-50%); width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .medal-1 { background: var(--gold); }
        .medal-2 { background: var(--silver); }
        .medal-3 { background: var(--bronze); }

        .results-grid { display: grid; gap: 20px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
        .product-card { background: white; padding: 25px; border-radius: 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; }

        .product-img { width: 120px; height: 120px; object-fit: contain; margin-bottom: 15px; align-self: center; border-radius: 12px; background: #f8fafc; }

        .price-tag { font-size: 2rem; font-weight: 900; color: #0f172a; margin: 15px 0; }
        #loader { display: none; text-align: center; padding: 60px; }
        .spinner { width: 60px; height: 60px; border: 6px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }

        #emailZone { display: none; background: #eff6ff; padding: 25px; border-radius: 20px; margin: 30px 0; border: 2px dashed var(--primary); text-align: center; gap: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card-main">
            <h1>🔍 SmartPrice</h1>
            <div class="subtitle">L'IA au service de votre budget. Évitez les accessoires, trouvez la console.</div>
            <div class="search-bar">
                <input type="text" id="query" placeholder="Ex: ps4, console ps5..." onkeypress="handleEnter(event)">
                <button class="btn-main" id="searchBtn" onclick="runSearch()">Comparer</button>
            </div>
        </div>

        <div id="podium-section">
            <h2 style="text-align: center; font-size: 2.2rem; margin-bottom: 50px;">🏆 Meilleures Offres Trouvées</h2>
            <div class="podium-container" id="podium-content"></div>
        </div>

        <div id="emailZone">
            <strong>📧 Envoyer le Top 10 par mail : </strong>
            <input type="email" id="userMail" placeholder="votre@email.com" style="padding: 10px; border-radius: 8px; border: 1px solid  #ddd; width: 250px;">
            <button onclick="sendMail()" style="background: var(--success); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">Recevoir</button>
        </div>

        <div id="loader">
            <div class="spinner"></div>
            <p><strong>Filtrage intelligent en cours...</strong><br>Nous séparons les consoles des jeux pour vous.</p>
        </div>

        <div id="results" class="results-grid"></div>
    </div>

    <script>
        const DEFAULT_IMG = "https://via.placeholder.com/200?text=Produit";

        let lastResults = [];

        function handleEnter(e) {
            if (e.key === 'Enter') runSearch();
        }

        async function runSearch() {
            const query = document.getElementById('query').value;
            if (!query.trim()) return;

            document.getElementById('podium-section').style.display = 'none';
            document.getElementById('emailZone').style.display = 'none';
            document.getElementById('results').innerHTML = '';
            document.getElementById('loader').style.display = 'block';

            try {
                const response = await fetch('/api/search', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ query })
                });
                lastResults = await response.json();
                document.getElementById('loader').style.display = 'none';

                if (!Array.isArray(lastResults) || lastResults.length === 0) {
                    alert("Aucun produit correspondant trouvé.");
                    return;
                }

                document.getElementById('emailZone').style.display = 'block';

                const top3 = lastResults.slice(0, 3);
                const others = lastResults.slice(3);

                renderPodium(top3);
                renderResults(others);
            } catch (e) {
                console.error(e);
                alert("Erreur serveur.");
                document.getElementById('loader').style.display = 'none';
            }
        }

        function renderPodium(top3) {
            const container = document.getElementById('podium-content');
            container.innerHTML = '';
            if (!top3 || top3.length === 0) {
                document.getElementById('podium-section').style.display = 'none';
                return;
            }
            document.getElementById('podium-section').style.display = 'block';

            const order = [];
            if (top3.length >= 2) order.push({data: top3[1], rank: 2, icon: '🥈'});
            if (top3.length >= 1) order.push({data: top3[0], rank: 1, icon: '🥇'});
            if (top3.length >= 3) order.push({data: top3[2], rank: 3, icon: '🥉'});

            order.forEach(item => {
                const rankClass = item.rank === 1 ? 'first' : (item.rank === 2 ? 'second' : 'third');
                const div = document.createElement('div');
                div.className = "podium-item " + rankClass;
                const imgSrc = item.data.image || DEFAULT_IMG;

                div.innerHTML = \`
                    <div class="medal-badge medal-\${item.rank}">\${item.icon}</div>
                    <img src="\${imgSrc}" class="product-img"
                         onerror="this.src='\${DEFAULT_IMG}'">
                    <div style="font-weight:bold; color:var(--primary)">\${item.data.site}</div>
                    <div class="price-tag">\${item.data.price}</div>
                    <a href="\${item.data.link}" target="_blank" style="color:var(--primary); font-weight:bold; text-decoration:none;">Voir l'offre</a>
                \`;
                container.appendChild(div);
            });
        }

        function renderResults(data) {
            const resDiv = document.getElementById('results');
            resDiv.innerHTML = '';

            data.forEach(item => {
                const card = document.createElement('div');
                card.className = "product-card";
                const imgSrc = item.image || DEFAULT_IMG;

                card.innerHTML = \`
                    <div style="font-weight:bold; color:var(--primary)">\${item.site}</div>
                    <img src="\${imgSrc}" class="product-img"
                         onerror="this.src='\${DEFAULT_IMG}'">
                    <div class="price-tag">\${item.price}</div>
                    <a href="\${item.link}" target="_blank" style="color:var(--primary); text-decoration:none; font-size:0.9rem;">Détails</a>
                \`;
                resDiv.appendChild(card);
            });
        }

        async function sendMail() {
            const email = document.getElementById('userMail').value;
            if (!email.includes('@')) return alert("Email invalide");

            try {
                const res = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        email,
                        results: lastResults,
                        query: document.getElementById('query').value
                    })
                });
                if (res.ok) {
                    alert("✅ Mail envoyé !");
                } else {
                    alert("Erreur à l'envoi du mail.");
                }
            } catch (e) {
                console.error(e);
                alert("Erreur réseau lors de l'envoi du mail.");
            }
        }
    </script>
</body>
</html>
`;

app.get("/", (_, res) => res.send(htmlContent));
app.listen(PORT, () =>
  console.log(`\n✅ SmartPrice : http://localhost:${PORT}\n`),
);
