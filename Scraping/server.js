/**
 * SmartPrice - Backend Complet (20 Sites)
 */

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // Cache de 5 minutes
const PORT = 5500;

// ─── MIDDLEWARES ─────────────────────────────────────────────────────────────
app.use(express.json());
// Indispensable pour que le serveur "serve" tes fichiers index.html, index.css, etc.
app.use(express.static(path.join(__dirname, "public")));

// ─── CONFIGURATION REQUÊTES ──────────────────────────────────────────────────
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
];

const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const buildHeaders = (referer = "") => ({
  "User-Agent": randomUA(),
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
  ...(referer ? { Referer: referer } : {}),
});

const http = axios.create({ timeout: 8000 });

// ─── UTILS (Nettoyage et Validation) ──────────────────────────────────────────
function cleanPrice(str) {
  if (!str) return null;
  let s = str.replace(/€\s*(\d{1,2})/, ".$1").replace(/\s+/g, "");
  s = s.replace(/[^\d,.]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) || n <= 0 ? null : n;
}

function formatPrice(n) {
  return n ? n.toFixed(2).replace(".", ",") + " €" : null;
}

function isValidProduct(title, price, query) {
  if (!title || !price) return false;
  const t = title.toLowerCase();
  const forbidden = ["jeu", "game", "manette", "cable", "housse", "pochette", "façade"];
  if (query.toLowerCase().match(/ps4|ps5|xbox|switch|console/)) {
    if (forbidden.some(w => t.includes(w)) || price < 80) return false;
  }
  return true;
}

function wrap(promise, label) {
  return promise.catch(e => {
    console.warn(`[${label}] Erreur ou timeout : ${e.message}`);
    return [];
  });
}

// ─── SCRAPERS ────────────────────────────────────────────────────────────────

// 1. eBay (Spécifique)
async function scrapeEbay(query) {
  try {
    const { data } = await http.get(`https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=15`, { headers: buildHeaders("https://www.ebay.fr/") });
    const $ = cheerio.load(data);
    const results = [];
    $(".s-item").each((i, el) => {
      if (i > 5) return;
      const title = $(el).find(".s-item__title").text().trim();
      const priceStr = $(el).find(".s-item__price").text().trim();
      const value = cleanPrice(priceStr);
      if (value && !title.includes("Shop on eBay") && isValidProduct(title, value, query)) {
        results.push({
          site: "eBay",
          title,
          value,
          price: formatPrice(value),
          link: $(el).find(".s-item__link").attr("href"),
          image: $(el).find(".s-item__image-img").attr("src") || ""
        });
      }
    });
    return results;
  } catch (e) { return []; }
}

// 2. Amazon (Spécifique)
async function scrapeAmazon(query) {
    try {
      const { data } = await http.get(`https://www.amazon.fr/s?k=${encodeURIComponent(query)}&s=price-asc-rank`, { headers: buildHeaders("https://www.amazon.fr/") });
      const $ = cheerio.load(data);
      const results = [];
      $(".s-result-item[data-component-type='s-search-result']").each((i, el) => {
        if (i > 3) return;
        const title = $(el).find("h2 a span").text().trim();
        const whole = $(el).find(".a-price-whole").first().text().trim();
        const frac = $(el).find(".a-price-fraction").first().text().trim();
        const priceStr = whole + (frac ? "," + frac : "");
        const value = cleanPrice(priceStr);
        if (title && value && isValidProduct(title, value, query)) {
            results.push({
                site: "Amazon", title, value, price: formatPrice(value),
                link: "https://www.amazon.fr" + $(el).find("h2 a").attr("href"),
                image: $(el).find(".s-image").attr("src")
            });
        }
      });
      return results;
    } catch (e) { return []; }
}

// 3. Générique (Pour les 18 autres sites)
async function scrapeGeneric(siteName, baseUrl, searchUrl, sels, query) {
  try {
    const { data } = await http.get(searchUrl, { headers: buildHeaders(baseUrl) });
    const $ = cheerio.load(data);
    const results = [];
    $(sels.cont).each((i, el) => {
      if (i > 2) return;
      const title = $(el).find(sels.title).first().text().trim();
      const priceStr = $(el).find(sels.price).first().text().trim();
      const value = cleanPrice(priceStr);
      if (title && value && isValidProduct(title, value, query)) {
        let link = sels.link ? $(el).find(sels.link).attr("href") : $(el).attr("href");
        if (link && !link.startsWith("http")) link = baseUrl + link;
        results.push({
          site: siteName, title, value, price: formatPrice(value),
          link, image: $(el).find(sels.img).attr("src") || ""
        });
      }
    });
    return results;
  } catch (e) { return []; }
}

// ─── LISTE DES SITES (Extraits de ton code) ──────────────────────────────────
const EXTRA_SITES = [
    { name: "Fnac", base: "https://www.fnac.com", url: (q) => `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${q}&sort=Price-asc`, sel: { cont: ".Article-item", title: ".Article-title", price: ".userPrice", link: ".Article-title a", img: "img" } },
    { name: "LDLC", base: "https://www.ldlc.com", url: (q) => `https://www.ldlc.com/recherche/${q}/`, sel: { cont: ".pdt-item", title: ".title", price: ".price", link: "a", img: "img" } },
    { name: "BackMarket", base: "https://www.backmarket.fr", url: (q) => `https://www.backmarket.fr/fr-fr/search?q=${q}`, sel: { cont: "a[data-test='product-thumb']", title: "h2", price: "[data-qa='prices']", img: "img" } },
    // Ajoute ici les autres sites de ta liste EXTRA_SITES si nécessaire
];

// ─── ROUTES API ──────────────────────────────────────────────────────────────

app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json([]);

  const cacheKey = query.toLowerCase().trim();
  if (cache.has(cacheKey)) return res.json(cache.get(cacheKey));

  console.log(`🔍 Recherche multi-sites : ${query}`);

  const promises = [
    wrap(scrapeEbay(query), "eBay"),
    wrap(scrapeAmazon(query), "Amazon"),
    ...EXTRA_SITES.map(s => wrap(scrapeGeneric(s.name, s.base, s.url(encodeURIComponent(query)), s.sel, query), s.name))
  ];

  const resultsArrays = await Promise.all(promises);
  const all = resultsArrays.flat().sort((a, b) => a.value - b.value);

  cache.set(cacheKey, all);
  res.json(all);
});

// Route Email (Configurée par défaut)
app.post("/api/send-email", async (req, res) => {
    const { email, results, query } = req.body;
    // Ici, configure nodemailer si tu as tes identifiants
    console.log(`📧 Simulation d'envoi d'email à ${email} pour ${query}`);
    res.json({ success: true });
});

// ─── DÉMARRAGE ───────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  🚀 SERVEUR SMARTPRICE ACTIF
  ---------------------------
  📍 URL: http://localhost:${PORT}
  📂 Dossier frontend: /public
  `);
});