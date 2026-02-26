const express = require("express");
const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
const nodemailer = require("nodemailer");

chromium.use(stealth);
const app = express();
app.use(express.json());

// ==========================================
// 1. CONFIGURATION EMAIL
// ==========================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "TON_EMAIL@gmail.com",
    pass: "TON_MOT_DE_PASSE_APPLICATION", // Code à 16 chiffres de Google
  },
});

// ==========================================
// 2. CONFIGURATION DES BOUTIQUES (12 Sites)
// ==========================================
const SITES_CONFIG = [
  {
    name: "Amazon",
    url: "https://www.amazon.fr/s?k=",
    container: ".s-result-item[data-component-type='s-search-result']",
    price: ".a-price-whole",
    link: "h2 a",
    image: ".s-image",
    title: "h2 a span",
    cookieBtn: "#sp-cc-rejectall-link",
    baseUrl: "https://www.amazon.fr",
  },
  {
    name: "Cdiscount",
    url: "https://www.cdiscount.com/search/10/",
    container: ".lpProduct",
    price: ".price",
    link: "a",
    image: "img",
    title: ".prdtTit",
    cookieBtn: "#footer_tc_privacy_button_2",
    baseUrl: "",
  },
  {
    name: "Fnac",
    url: "https://www.fnac.com/SearchResult/ResultList.aspx?Search=",
    container: ".Article-item",
    price: ".userPrice",
    link: ".Article-title a",
    image: ".Article-itemVisualImg",
    title: ".Article-title",
    cookieBtn: "#onetrust-reject-all-handler",
    baseUrl: "",
  },
  {
    name: "Darty",
    url: "https://www.darty.com/nav/recherche/",
    container: ".product-card",
    price: ".product-price",
    link: ".product-title a",
    image: ".product-image img",
    title: ".product-title",
    cookieBtn: ".darty_f_f_button_secondary",
    baseUrl: "https://www.darty.com",
  },
  {
    name: "Boulanger",
    url: "https://www.boulanger.com/resultats?tr=",
    container: ".product-list__item",
    price: ".price__amount",
    link: "a.product-list__product-link, h2 a",
    image: "img",
    title: "h2",
    cookieBtn: "#didomi-notice-agree-button",
    baseUrl: "https://www.boulanger.com",
  },
  {
    name: "Rakuten",
    url: "https://fr.shopping.rakuten.com/s/",
    container: ".itemContainer",
    price: ".price",
    link: "a",
    image: "img",
    title: ".itemTitle",
    cookieBtn: "#onetrust-reject-all-handler",
    baseUrl: "https://fr.shopping.rakuten.com",
  },
  {
    name: "eBay",
    url: "https://www.ebay.fr/sch/i.html?_nkw=",
    container: ".s-item",
    price: ".s-item__price",
    link: ".s-item__link",
    image: ".s-item__image-img",
    title: ".s-item__title",
    cookieBtn: "#gdpr-banner-decline",
    baseUrl: "",
  },
  {
    name: "LDLC",
    url: "https://www.ldlc.com/recherche/",
    container: ".pdt-item",
    price: ".price",
    link: ".pdt-info a",
    image: ".pic a img",
    title: ".pdt-info a",
    cookieBtn: "#onetrust-reject-all-handler",
    baseUrl: "https://www.ldlc.com",
  },
  {
    name: "Materiel.net",
    url: "https://www.materiel.net/recherche/",
    container: ".c-product",
    price: ".o-product__price",
    link: ".c-product__link",
    image: ".c-product__thumb img",
    title: ".c-product__link",
    cookieBtn: "#onetrust-reject-all-handler",
    baseUrl: "https://www.materiel.net",
  },
  {
    name: "Electro Dépôt",
    url: "https://www.electrodepot.fr/catalogsearch/result/?q=",
    container: ".product-item-info",
    price: ".price",
    link: "a.product-item-link",
    image: ".product-image-photo",
    title: ".product-item-link",
    cookieBtn: "#onetrust-reject-all-handler",
    baseUrl: "",
  },
  {
    name: "Rue du Commerce",
    url: "https://www.rueducommerce.fr/recherche/",
    container: ".product-card",
    price: ".product-card__price-now",
    link: "a",
    image: "img",
    title: ".product-card__title",
    cookieBtn: ".p-cookie-banner__button--reject",
    baseUrl: "https://www.rueducommerce.fr",
  },
  {
    name: "Decathlon",
    url: "https://www.decathlon.fr/search?Ntt=",
    container: ".vtmn-product-card",
    price: ".vtmn-price",
    link: "a",
    image: "img",
    title: "h3",
    cookieBtn: "#didomi-notice-agree-button",
    baseUrl: "https://www.decathlon.fr",
  },
];

// ==========================================
// 3. FILTRE INTELLIGENT (Anti-Accessoires)
// ==========================================
function isConsolesSearch(query) {
  const consoleKeywords = [
    "ps1",
    "ps2",
    "ps3",
    "ps4",
    "ps5",
    "xbox",
    "switch",
    "console",
    "playstation",
    "nintendo",
  ];
  return consoleKeywords.some((kw) => query.toLowerCase().includes(kw));
}

function isValidProduct(title, price, query) {
  const lowerTitle = title.toLowerCase();
  if (isConsolesSearch(query)) {
    const forbidden = [
      "jeu",
      "game",
      "manette",
      "controller",
      "levier",
      "vitesse",
      "shifter",
      "volant",
      "wheel",
      "pedalier",
      "pédalier",
      "skin",
      "pochette",
      "accessoire",
      "cable",
      "câble",
      "chargeur",
      "housse",
      "façade",
      "support",
      "dock",
      "oreillette",
    ];
    if (forbidden.some((word) => lowerTitle.includes(word))) return false;
    // Seuil de prix : une PS3/PS4 à moins de 60€ est souvent une arnaque ou une pièce détachée
    if (price < 60) return false;
  }
  return true;
}

// ==========================================
// 4. FRONT-END (HTML / CSS / JS)
// ==========================================
const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartPrice | Comparateur Intelligent</title>
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
        .product-card { background: white; padding: 25px; border-radius: 20px; display: flex; flex-direction: column; border: 1px solid #e2e8f0; }
        .product-img { width: 120px; height: 120px; object-fit: contain; margin-bottom: 15px; align-self: center; }
        .price-tag { font-size: 2rem; font-weight: 900; color: #0f172a; margin: 15px 0; }
        
        #loader { display: none; text-align: center; padding: 60px; }
        .spinner { width: 60px; height: 60px; border: 6px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        #emailZone { display: none; background: #eff6ff; padding: 25px; border-radius: 20px; margin: 30px 0; border: 2px dashed var(--primary); text-align: center; gap: 15px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="card-main">
            <h1>🔍 SmartPrice</h1>
            <div class="subtitle">Le comparateur qui fait la différence entre une console et un levier de vitesse.</div>
            <div class="search-bar">
                <input type="text" id="query" placeholder="Ex: ps3, console ps4..." onkeypress="handleEnter(event)">
                <button class="btn-main" onclick="runSearch()">Comparer</button>
            </div>
        </div>

        <div id="podium-section">
            <h2 style="text-align: center; font-size: 2.2rem; margin-bottom: 50px;">🏆 Le Podium des Meilleures Offres</h2>
            <div class="podium-container" id="podium-content"></div>
        </div>

        <div id="emailZone">
            <strong>📧 Sauvegarder ce classement : </strong>
            <input type="email" id="userMail" placeholder="votre@email.com" style="padding:10px; border-radius:8px; border:1px solid #ddd; width:250px;">
            <button onclick="sendMail()" style="background:var(--success); color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:bold;">Envoyer</button>
        </div>

        <div id="loader">
            <div class="spinner"></div>
            <p><strong>Filtrage SmartPrice en cours...</strong><br>Nous nettoyons les résultats pour vous.</p>
        </div>

        <div id="results" class="results-grid"></div>
    </div>

    <script>
        let lastResults = [];
        function handleEnter(e) { if(e.key === 'Enter') runSearch(); }

        async function runSearch() {
            const query = document.getElementById('query').value;
            if(!query.trim()) return;
            
            document.getElementById('podium-section').style.display = 'none';
            document.getElementById('results').innerHTML = '';
            document.getElementById('loader').style.display = 'block';

            const resp = await fetch('/api/search', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ query })
            });
            lastResults = await resp.json();
            
            document.getElementById('loader').style.display = 'none';
            if(lastResults.length > 0) {
                document.getElementById('emailZone').style.display = 'flex';
                renderPodium(lastResults.slice(0, 3));
                renderResults(lastResults.slice(3));
            } else { alert("Aucune console trouvée."); }
        }

        function renderPodium(top3) {
            const container = document.getElementById('podium-content');
            container.innerHTML = '';
            document.getElementById('podium-section').style.display = 'block';
            const order = [];
            if(top3.length >= 2) order.push({data: top3[1], rank: 2, icon: '🥈'});
            if(top3.length >= 1) order.push({data: top3[0], rank: 1, icon: '🥇'});
            if(top3.length >= 3) order.push({data: top3[2], rank: 3, icon: '🥉'});

            order.forEach(item => {
                const div = document.createElement('div');
                div.className = "podium-item " + (item.rank === 1 ? 'first' : (item.rank === 2 ? 'second' : 'third'));
                div.innerHTML = \`
                    <div class="medal-badge medal-\${item.rank}">\${item.icon}</div>
                    <img src="\${item.data.image}" class="product-img">
                    <div style="font-weight:bold; color:var(--primary)">\${item.data.site}</div>
                    <div class="price-tag">\${item.data.price}</div>
                    <a href="\${item.data.link}" target="_blank" style="color:var(--primary); font-weight:bold; text-decoration:none;">Acheter</a>
                \`;
                container.appendChild(div);
            });
        }

        function renderResults(data) {
            const resDiv = document.getElementById('results');
            data.forEach(item => {
                const card = document.createElement('div');
                card.className = "product-card";
                card.innerHTML = \`
                    <div style="font-weight:bold; color:var(--primary)">\${item.site}</div>
                    <img src="\${item.image}" class="product-img">
                    <div class="price-tag">\${item.price}</div>
                    <a href="\${item.link}" target="_blank" style="color:var(--primary); text-decoration:none;">Détails</a>
                \`;
                resDiv.appendChild(card);
            });
        }

        async function sendMail() {
            const email = document.getElementById('userMail').value;
            if(!email.includes('@')) return alert("Email invalide");
            await fetch('/api/send-email', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email, results: lastResults, query: document.getElementById('query').value })
            });
            alert("Mail envoyé !");
        }
    </script>
</body>
</html>
`;

// ==========================================
// 5. LOGIQUE SERVEUR (SCRAPING)
// ==========================================
app.get("/", (req, res) => res.send(htmlContent));

app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  const browser = await chromium.launch({ headless: true });
  let results = [];

  for (let i = 0; i < SITES_CONFIG.length; i += 3) {
    const chunk = SITES_CONFIG.slice(i, i + 3);
    const tasks = chunk.map(async (site) => {
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
      });
      const page = await context.newPage();
      try {
        await page.goto(site.url + encodeURIComponent(query), {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });
        if (site.cookieBtn)
          try {
            await page.click(site.cookieBtn, { timeout: 2000 });
          } catch (e) {}
        await page.waitForSelector(site.container, { timeout: 6000 });

        const data = await page.evaluate((conf) => {
          const boxes = document.querySelectorAll(conf.container);
          let found = [];
          for (let i = 0; i < Math.min(boxes.length, 5); i++) {
            const b = boxes[i];
            const p = b.querySelector(conf.price);
            const l = b.querySelector(conf.link);
            const im = b.querySelector(conf.image);
            const t = b.querySelector(conf.title);
            if (p && l && t) {
              found.push({
                priceTxt: p.innerText,
                title: t.innerText,
                linkHref: l.getAttribute("href"),
                imgSrc: im ? im.getAttribute("src") : "",
              });
            }
          }
          return found;
        }, site);

        data.forEach((item) => {
          const numericPrice = parseFloat(
            item.priceTxt.replace(/[^\d,.]/g, "").replace(",", "."),
          );
          if (isValidProduct(item.title, numericPrice, query)) {
            let fl = item.linkHref;
            if (fl && !fl.startsWith("http")) fl = site.baseUrl + fl;
            results.push({
              site: site.name,
              price: item.priceTxt.trim(),
              value: numericPrice,
              link: fl,
              image: item.imgSrc,
            });
          }
        });
      } catch (e) {
      } finally {
        await context.close();
      }
    });
    await Promise.all(tasks);
  }
  await browser.close();
  results.sort((a, b) => a.value - b.value);
  res.json(results);
});

app.post("/api/send-email", async (req, res) => {
  const { email, results, query } = req.body;
  await transporter.sendMail({
    from: '"SmartPrice" <TON_EMAIL@gmail.com>',
    to: email,
    subject: `Rapport : ${query}`,
    html:
      `<h3>Top offres :</h3>` +
      results
        .slice(0, 10)
        .map((r) => `<p>${r.site}: ${r.price}</p>`)
        .join(""),
  });
  res.json({ success: true });
});

app.listen(3000, () => console.log("✅ SmartPrice : http://localhost:3000"));
