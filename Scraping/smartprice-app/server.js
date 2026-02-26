const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");
const path = require("path");

const app = express();
const cache = new NodeCache({ stdTTL: 600 }); // Cache de 10 minutes
const PORT = 5500;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

const http = axios.create({ timeout: 10000 });

// Nettoyage du prix (ex: "1 299,00 €" -> 1299.00)
function cleanPrice(str) {
  if (!str) return null;
  let s = str
    .replace(/\s/g, "")
    .replace(/[^0-9,.]/g, "")
    .replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Validation pour éviter les accessoires (ex: manettes à 20€ quand on cherche une console)
function isValid(title, price, query) {
  const t = title.toLowerCase();
  const q = query.toLowerCase();
  if (q.includes("ps4") || q.includes("ps5") || q.includes("console")) {
    const filters = ["jeu", "game", "manette", "housse", "cable", "coque"];
    if (filters.some((f) => t.includes(f)) && price < 100) return false;
  }
  return price > 5; // Ignore les objets à 1€ ou erreurs
}

// --- SCRAPERS ---

async function scrapeEbay(q) {
  try {
    const { data } = await http.get(
      `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(q)}&_sop=15`,
      {
        headers: { "User-Agent": USER_AGENTS[0] },
      },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".s-item").each((i, el) => {
      const title = $(el).find(".s-item__title").text();
      const priceStr = $(el).find(".s-item__price").text();
      const value = cleanPrice(priceStr);
      if (
        value &&
        !title.includes("Shop on eBay") &&
        isValid(title, value, q)
      ) {
        results.push({
          site: "eBay",
          title: title.trim(),
          value,
          price: value.toFixed(2) + " €",
          link: $(el).find(".s-item__link").attr("href"),
          image: $(el).find(".s-item__image-img").attr("src"),
        });
      }
    });
    return results.slice(0, 5);
  } catch (e) {
    return [];
  }
}

async function scrapeBackMarket(q) {
  try {
    const { data } = await http.get(
      `https://www.backmarket.fr/fr-fr/search?q=${encodeURIComponent(q)}`,
      {
        headers: { "User-Agent": USER_AGENTS[1] },
      },
    );
    const $ = cheerio.load(data);
    const results = [];
    $("a[data-test='product-thumb']").each((i, el) => {
      const title = $(el).find("h2").text().trim();
      const priceStr = $(el).find("[data-qa='prices']").text();
      const value = cleanPrice(priceStr);
      if (value && isValid(title, value, q)) {
        results.push({
          site: "BackMarket",
          title,
          value,
          price: value.toFixed(2) + " €",
          link: "https://www.backmarket.fr" + $(el).attr("href"),
          image: $(el).find("img").attr("src"),
        });
      }
    });
    return results.slice(0, 5);
  } catch (e) {
    return [];
  }
}

// --- ROUTES ---

app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.json([]);

  if (cache.has(query)) return res.json(cache.get(query));

  console.log(`🔍 Recherche : ${query}`);

  // Exécution parallèle des scrapers
  const allResults = await Promise.all([
    scrapeEbay(query),
    scrapeBackMarket(query),
  ]);

  const merged = allResults.flat().sort((a, b) => a.value - b.value);
  cache.set(query, merged);
  res.json(merged);
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
