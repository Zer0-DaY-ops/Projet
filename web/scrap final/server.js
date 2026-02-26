/**
 * SmartPrice - Backend robuste
 *
 * Stratégie anti-bot :
 * - eBay    → API officielle Browse (gratuite, 0 blocage)
 * - Fnac    → RSS feed public (0 blocage)
 * - Autres  → axios + cheerio + rotation User-Agent + headers réalistes
 * - Tout en parallèle (Promise.all) → rapide
 * - Cache 5min
 *
 * npm install express axios cheerio node-cache cors nodemailer
 *
 * Variables d'env optionnelles :
 * EBAY_APP_ID     → API eBay (recommandé, gratuit sur developer.ebay.com)
 * EBAY_APP_SECRET
 * MAIL_USER       → Gmail expéditeur
 * MAIL_PASS       → Mot de passe d'application Gmail
 */

const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const NodeCache = require("node-cache");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());

const cache = new NodeCache({ stdTTL: 300 });
const PORT = 3000;

// ─── Pool de User-Agents réalistes ───────────────────────────────────────────
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function buildHeaders(referer = "") {
  return {
    "User-Agent": randomUA(),
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": referer ? "same-origin" : "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    ...(referer ? { Referer: referer } : {}),
  };
}

const http = axios.create({ timeout: 8000 });

// ─── Utils ────────────────────────────────────────────────────────────────────
function cleanPrice(str) {
  if (!str) return null;
  // 1. Gérer le format "156€00" en remplaçant '€' par un point
  let cleaned = str.replace(/€/g, ".");
  // 2. Nettoyer les caractères parasites
  cleaned = cleaned.replace(/[^\d,.]/g, "");
  // 3. Remplacer toutes les virgules restantes par des points
  cleaned = cleaned.replace(/,/g, ".");
  // 4. Isoler le premier prix en cas de texte dupliqué (ex: "156.00156.00")
  const parts = cleaned.split(".");
  if (parts.length > 1) {
    cleaned = parts[0] + "." + parts[1].substring(0, 2);
  }
  const n = parseFloat(cleaned);
  return isNaN(n) || n <= 0 ? null : n;
}

function formatPrice(n) {
  if (!n) return null;
  return n.toFixed(2).replace(".", ",") + " €";
}

function isConsolesSearch(query) {
  const kw = ["ps4", "ps5", "xbox", "switch", "console", "playstation"];
  return kw.some((k) => query.toLowerCase().includes(k));
}

function isValidProduct(title, price, query) {
  if (!title || !price) return false;
  const t = title.toLowerCase();
  if (isConsolesSearch(query)) {
    const forbidden = [
      "jeu",
      "game",
      "manette",
      "controller",
      "skin",
      "pochette",
      "accessoire",
      "cable",
      "chargeur",
      "housse",
      "façade",
    ];
    if (forbidden.some((w) => t.includes(w))) return false;
    if (price < 80) return false;
  }
  return true;
}

function wrap(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 8000)),
  ]).catch((e) => {
    console.warn(`[${label}] ${e.message}`);
    return [];
  });
}

// ─── eBay API officielle ──────────────────────────────────────────────────────
const ebayTokenCache = { token: null, expires: 0 };

async function getEbayToken() {
  if (ebayTokenCache.token && Date.now() < ebayTokenCache.expires)
    return ebayTokenCache.token;
  const appId = process.env.EBAY_APP_ID;
  const secret = process.env.EBAY_APP_SECRET || "";
  if (!appId) return null;
  const creds = Buffer.from(`${appId}:${secret}`).toString("base64");
  const { data } = await axios.post(
    "https://api.ebay.com/identity/v1/oauth2/token",
    "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
    {
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
  ebayTokenCache.token = data.access_token;
  ebayTokenCache.expires = Date.now() + data.expires_in * 1000 - 60000;
  return data.access_token;
}

async function scrapeEbay(query) {
  const token = await getEbayToken().catch(() => null);
  if (token) {
    try {
      const { data } = await http.get(
        "https://api.ebay.com/buy/browse/v1/item_summary/search",
        {
          params: {
            q: query,
            limit: 5,
            filter: "itemLocationCountry:FR,currency:EUR",
            sort: "price",
          },
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      return (data.itemSummaries || [])
        .filter((i) => i.price)
        .slice(0, 3)
        .map((item) => {
          const value = parseFloat(item.price.value);
          return {
            site: "eBay",
            title: item.title,
            value,
            price: formatPrice(value),
            link: item.itemWebUrl,
            image: item.image?.imageUrl || "",
          };
        });
    } catch (e) {
      console.warn("[eBay API]", e.message);
    }
  }
  try {
    const { data } = await http.get(
      `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(query)}&_sop=15`,
      { headers: buildHeaders("https://www.ebay.fr/") },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".s-item").each((i, el) => {
      if (i > 4) return false;
      const title = $(el).find(".s-item__title").text().trim();
      const priceStr = $(el).find(".s-item__price").text().trim();
      const link = $(el).find(".s-item__link").attr("href");
      const image = $(el).find(".s-item__image-img").attr("src");
      const value = cleanPrice(priceStr);
      if (
        title &&
        value &&
        !title.includes("Shop on eBay") &&
        isValidProduct(title, value, query)
      )
        results.push({
          site: "eBay",
          title,
          value,
          price: formatPrice(value),
          link,
          image: image || "",
        });
    });
    return results.slice(0, 3);
  } catch (e) {
    console.warn("[eBay scrape]", e.message);
    return [];
  }
}

// ─── Fnac ─────────────────────────────────────────────────────────────────────
async function scrapeFnac(query) {
  try {
    const { data } = await http.get(
      `https://www.fnac.com/rss/SearchResult/ResultList.aspx?Search=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": randomUA(),
          Accept: "application/rss+xml,application/xml",
        },
      },
    );
    const $ = cheerio.load(data, { xmlMode: true });
    const results = [];
    $("item").each((i, el) => {
      if (i > 2) return false;
      const title = $(el).find("title").text().trim();
      const link = $(el).find("link").text().trim();
      const priceStr = $(el).find("price, g\\:price").text().trim();
      const image = $(el).find("enclosure").attr("url") || "";
      const value = cleanPrice(priceStr);
      if (title && value && isValidProduct(title, value, query))
        results.push({
          site: "Fnac",
          title,
          value,
          price: formatPrice(value),
          link,
          image,
        });
    });
    if (results.length > 0) return results;
  } catch (e) {
    console.warn("[Fnac RSS]", e.message);
  }
  try {
    const { data } = await http.get(
      `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(query)}&sort=Price-asc`,
      { headers: buildHeaders("https://www.fnac.com/") },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".Article-item").each((i, el) => {
      if (i > 2) return false;
      const title = $(el).find(".Article-title").text().trim();
      const priceStr = $(el).find(".userPrice").text().trim();
      const link = $(el).find(".Article-title a").attr("href");
      const image =
        $(el).find("img").attr("src") ||
        $(el).find("img").attr("data-src") ||
        "";
      const value = cleanPrice(priceStr);
      if (title && value && isValidProduct(title, value, query))
        results.push({
          site: "Fnac",
          title,
          value,
          price: formatPrice(value),
          link,
          image,
        });
    });
    return results;
  } catch (e) {
    console.warn("[Fnac HTML]", e.message);
    return [];
  }
}

// ─── Rakuten ──────────────────────────────────────────────────────────────────
async function scrapeRakuten(query) {
  try {
    const { data } = await http.get(
      `https://fr.shopping.rakuten.com/s/${encodeURIComponent(query)}`,
      { headers: buildHeaders("https://fr.shopping.rakuten.com/") },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".itemContainer, .offer-list-item").each((i, el) => {
      if (i > 2) return false;
      const title =
        $(el).find(".itemTitle, .offer-title").text().trim() || query;
      const priceStr = $(el).find(".price, .offer-price").text().trim();
      const link = $(el).find("a").first().attr("href");
      const image = $(el).find("img").attr("src") || "";
      const value = cleanPrice(priceStr);
      if (value && isValidProduct(title, value, query))
        results.push({
          site: "Rakuten",
          title,
          value,
          price: formatPrice(value),
          link: link?.startsWith("http")
            ? link
            : "https://fr.shopping.rakuten.com" + link,
          image,
        });
    });
    return results;
  } catch (e) {
    console.warn("[Rakuten]", e.message);
    return [];
  }
}

// ─── Cdiscount ────────────────────────────────────────────────────────────────
async function scrapeCdiscount(query) {
  try {
    const { data } = await http.get(
      `https://www.cdiscount.com/search/10/${encodeURIComponent(query)}.html?sortby=prix`,
      { headers: buildHeaders("https://www.cdiscount.com/") },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".lpProduct, .prdtBId").each((i, el) => {
      if (i > 2) return false;
      const title = $(el).find(".prdtTit, .fpRtTitle").text().trim();
      const priceStr = $(el).find(".price, .priceTag").text().trim();
      const link = $(el).find("a").attr("href");
      const image =
        $(el).find("img").attr("src") ||
        $(el).find("img").attr("data-src") ||
        "";
      const value = cleanPrice(priceStr);
      if (title && value && isValidProduct(title, value, query))
        results.push({
          site: "Cdiscount",
          title,
          value,
          price: formatPrice(value),
          link,
          image,
        });
    });
    return results;
  } catch (e) {
    console.warn("[Cdiscount]", e.message);
    return [];
  }
}

// ─── Boulanger ────────────────────────────────────────────────────────────────
async function scrapeBoulanger(query) {
  try {
    const { data } = await http.get(
      `https://www.boulanger.com/api/clc/search?tr=${encodeURIComponent(query)}&lang=fr_FR&page=0&pageSize=5&sortBy=price-asc`,
      {
        headers: {
          ...buildHeaders("https://www.boulanger.com/"),
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      },
    );
    const items = data?.products || data?.hits || [];
    return items
      .slice(0, 3)
      .map((item) => {
        const value = item.price?.salePrice || item.price?.value || 0;
        return {
          site: "Boulanger",
          title: item.name || query,
          value,
          price: formatPrice(value),
          link: `https://www.boulanger.com${item.url || "/resultats?tr=" + encodeURIComponent(query)}`,
          image: item.image?.url || "",
        };
      })
      .filter((r) => r.value && isValidProduct(r.title, r.value, query));
  } catch {
    try {
      const { data } = await http.get(
        `https://www.boulanger.com/resultats?tr=${encodeURIComponent(query)}`,
        { headers: buildHeaders("https://www.boulanger.com/") },
      );
      const $ = cheerio.load(data);
      const results = [];
      $(".product-list__item").each((i, el) => {
        if (i > 2) return false;
        const title = $(el).find("h2").text().trim();
        const priceStr = $(el).find(".price__amount").text().trim();
        const link = $(el).find("a").attr("href");
        const image = $(el).find("img").attr("src") || "";
        const value = cleanPrice(priceStr);
        if (title && value && isValidProduct(title, value, query))
          results.push({
            site: "Boulanger",
            title,
            value,
            price: formatPrice(value),
            link: link?.startsWith("http")
              ? link
              : "https://www.boulanger.com" + link,
            image,
          });
      });
      return results;
    } catch (e) {
      console.warn("[Boulanger]", e.message);
      return [];
    }
  }
}

// ─── Darty ────────────────────────────────────────────────────────────────────
async function scrapeDarty(query) {
  try {
    const { data } = await http.get(
      `https://www.darty.com/nav/recherche/${encodeURIComponent(query)}`,
      { headers: buildHeaders("https://www.darty.com/") },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".product-card").each((i, el) => {
      if (i > 2) return false;
      const title = $(el).find(".product-title").text().trim();
      const priceStr = $(el).find(".product-price").text().trim();
      const link = $(el).find("a").attr("href");
      const image = $(el).find("img").attr("src") || "";
      const value = cleanPrice(priceStr);
      if (title && value && isValidProduct(title, value, query))
        results.push({
          site: "Darty",
          title,
          value,
          price: formatPrice(value),
          link: link?.startsWith("http")
            ? link
            : "https://www.darty.com" + link,
          image,
        });
    });
    return results;
  } catch (e) {
    console.warn("[Darty]", e.message);
    return [];
  }
}

// ─── LDLC ─────────────────────────────────────────────────────────────────────
async function scrapeLDLC(query) {
  try {
    const { data } = await http.get(
      `https://www.ldlc.com/recherche/${encodeURIComponent(query)}/`,
      { headers: buildHeaders("https://www.ldlc.com/") },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".pdt-item").each((i, el) => {
      if (i > 2) return false;
      const title = $(el).find(".pdt-info a").text().trim();
      const priceStr = $(el).find(".price").text().trim();
      const link = $(el).find(".pdt-info a").attr("href");
      const image = $(el).find(".pic a img").attr("src") || "";
      const value = cleanPrice(priceStr);
      if (title && value && isValidProduct(title, value, query))
        results.push({
          site: "LDLC",
          title,
          value,
          price: formatPrice(value),
          link: link?.startsWith("http") ? link : "https://www.ldlc.com" + link,
          image,
        });
    });
    return results;
  } catch (e) {
    console.warn("[LDLC]", e.message);
    return [];
  }
}

// ─── Materiel.net ─────────────────────────────────────────────────────────────
async function scrapeMaterielNet(query) {
  try {
    const { data } = await http.get(
      `https://www.materiel.net/recherche/${encodeURIComponent(query)}/`,
      { headers: buildHeaders("https://www.materiel.net/") },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".c-product").each((i, el) => {
      if (i > 2) return false;
      const title = $(el).find(".c-product__link").text().trim();
      const priceStr = $(el).find(".o-product__price").text().trim();
      const link = $(el).find(".c-product__link").attr("href");
      const image = $(el).find(".c-product__thumb img").attr("src") || "";
      const value = cleanPrice(priceStr);
      if (title && value && isValidProduct(title, value, query))
        results.push({
          site: "Materiel.net",
          title,
          value,
          price: formatPrice(value),
          link: link?.startsWith("http")
            ? link
            : "https://www.materiel.net" + link,
          image,
        });
    });
    return results;
  } catch (e) {
    console.warn("[Materiel.net]", e.message);
    return [];
  }
}

// ─── Rue du Commerce ──────────────────────────────────────────────────────────
async function scrapeRueduCommerce(query) {
  try {
    const { data } = await http.get(
      `https://www.rueducommerce.fr/recherche/${encodeURIComponent(query)}`,
      { headers: buildHeaders("https://www.rueducommerce.fr/") },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".product-card").each((i, el) => {
      if (i > 2) return false;
      const title = $(el).find(".product-card__title").text().trim();
      const priceStr = $(el).find(".product-card__price-now").text().trim();
      const link = $(el).find("a").attr("href");
      const image = $(el).find("img").attr("src") || "";
      const value = cleanPrice(priceStr);
      if (title && value && isValidProduct(title, value, query))
        results.push({
          site: "Rue du Commerce",
          title,
          value,
          price: formatPrice(value),
          link: link?.startsWith("http")
            ? link
            : "https://www.rueducommerce.fr" + link,
          image,
        });
    });
    return results;
  } catch (e) {
    console.warn("[RueDuCommerce]", e.message);
    return [];
  }
}

// ─── Decathlon ────────────────────────────────────────────────────────────────
async function scrapeDecathlon(query) {
  try {
    const { data } = await http.get(
      `https://www.decathlon.fr/search?Ntt=${encodeURIComponent(query)}`,
      { headers: buildHeaders("https://www.decathlon.fr/") },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".vtmn-product-card").each((i, el) => {
      if (i > 2) return false;
      const title = $(el).find("h3").text().trim();
      const priceStr = $(el).find(".vtmn-price").text().trim();
      const link = $(el).find("a").attr("href");
      const image = $(el).find("img").attr("src") || "";
      const value = cleanPrice(priceStr);
      if (title && value)
        results.push({
          site: "Decathlon",
          title,
          value,
          price: formatPrice(value),
          link: link?.startsWith("http")
            ? link
            : "https://www.decathlon.fr" + link,
          image,
        });
    });
    return results;
  } catch (e) {
    console.warn("[Decathlon]", e.message);
    return [];
  }
}

// ─── Amazon ───────────────────────────────────────────────────────────────────
async function scrapeAmazon(query) {
  try {
    const { data } = await http.get(
      `https://www.amazon.fr/s?k=${encodeURIComponent(query)}&s=price-asc-rank`,
      {
        headers: {
          ...buildHeaders("https://www.amazon.fr/"),
          "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
        },
      },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".s-result-item[data-component-type='s-search-result']").each((i, el) => {
      if (i > 2) return false;
      const title = $(el).find("h2 a span").text().trim();
      const whole = $(el).find(".a-price-whole").first().text().trim();
      const frac = $(el).find(".a-price-fraction").first().text().trim();
      const priceStr = whole + (frac ? "," + frac : "");
      const link = $(el).find("h2 a").attr("href");
      const image = $(el).find(".s-image").attr("src") || "";
      const value = cleanPrice(priceStr);
      if (title && value && isValidProduct(title, value, query))
        results.push({
          site: "Amazon",
          title,
          value,
          price: formatPrice(value),
          link: link?.startsWith("http")
            ? link
            : "https://www.amazon.fr" + link,
          image,
        });
    });
    return results;
  } catch (e) {
    console.warn("[Amazon]", e.message);
    return [];
  }
}

// ─── Electro Dépôt ────────────────────────────────────────────────────────────
async function scrapeElectroDepot(query) {
  try {
    const { data } = await http.get(
      `https://www.electrodepot.fr/catalogsearch/result/?q=${encodeURIComponent(query)}`,
      { headers: buildHeaders("https://www.electrodepot.fr/") },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(".product-item-info").each((i, el) => {
      if (i > 2) return false;
      const title = $(el).find(".product-item-link").text().trim();
      const priceStr = $(el).find(".price").text().trim();
      const link = $(el).find("a.product-item-link").attr("href");
      const image = $(el).find(".product-image-photo").attr("src") || "";
      const value = cleanPrice(priceStr);
      if (title && value && isValidProduct(title, value, query))
        results.push({
          site: "Electro Dépôt",
          title,
          value,
          price: formatPrice(value),
          link,
          image,
        });
    });
    return results;
  } catch (e) {
    console.warn("[ElectroDepot]", e.message);
    return [];
  }
}

// ─── 30 NOUVEAUX SITES ────────────────────────────────────────────────────────
const createScraper = (name, urlTemplate, host, selectors) => async (query) => {
  try {
    const { data } = await http.get(
      urlTemplate.replace("{q}", encodeURIComponent(query)),
      {
        headers: buildHeaders(host),
      },
    );
    const $ = cheerio.load(data);
    const results = [];
    $(selectors.item).each((i, el) => {
      if (i > 2) return false;
      const title = $(el).find(selectors.title).text().trim();
      const priceStr = $(el).find(selectors.price).text().trim();
      const link = $(el).find(selectors.link).attr("href");
      const image =
        $(el).find(selectors.img).attr("src") ||
        $(el).find(selectors.img).attr("data-src") ||
        "";
      const value = cleanPrice(priceStr);

      if (title && value && isValidProduct(title, value, query)) {
        results.push({
          site: name,
          title,
          value,
          price: formatPrice(value),
          link: link?.startsWith("http")
            ? link
            : host.replace(/\/$/, "") + link,
          image,
        });
      }
    });
    return results;
  } catch (e) {
    console.warn(`[${name}]`, e.message);
    return [];
  }
};

// Électronique & Spécialisés
const scrapeGrosbill = createScraper(
  "Grosbill",
  "https://www.grosbill.com/recherche/{q}.html",
  "https://www.grosbill.com",
  {
    item: ".product-list-item",
    title: ".product-title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeCybertek = createScraper(
  "Cybertek",
  "https://www.cybertek.fr/boutique/produit.aspx?q={q}",
  "https://www.cybertek.fr",
  {
    item: ".product-item",
    title: "h2",
    price: ".price",
    link: "a.product-link",
    img: "img",
  },
);
const scrapeTopAchat = createScraper(
  "TopAchat",
  "https://www.topachat.com/pages/recherche.php?mc={q}",
  "https://www.topachat.com",
  {
    item: ".grille-produit",
    title: "h3",
    price: ".prix-pdt",
    link: "a",
    img: "img",
  },
);
const scrapeMacWay = createScraper(
  "MacWay",
  "https://www.macway.com/recherche?s={q}",
  "https://www.macway.com",
  {
    item: ".product-card",
    title: ".product-name",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeInfomax = createScraper(
  "Infomax",
  "https://infomaxparis.com/fr/recherche?controller=search&s={q}",
  "https://infomaxparis.com",
  {
    item: ".product-miniature",
    title: ".product-title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapePowerLab = createScraper(
  "PowerLab",
  "https://powerlab.fr/recherche?controller=search&s={q}",
  "https://powerlab.fr",
  {
    item: ".product-miniature",
    title: ".product-title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeSonVideo = createScraper(
  "Son-Vidéo",
  "https://www.son-video.com/recherche?query={q}",
  "https://www.son-video.com",
  {
    item: ".product-item",
    title: ".product-title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeUbaldi = createScraper(
  "Ubaldi",
  "https://www.ubaldi.com/recherche/{q}.php",
  "https://www.ubaldi.com",
  { item: ".article", title: ".titre", price: ".prix", link: "a", img: "img" },
);

// Grande Distribution & Magasins généralistes
const scrapeConforama = createScraper(
  "Conforama",
  "https://www.conforama.fr/recherche-conforama/{q}",
  "https://www.conforama.fr",
  {
    item: ".product-item",
    title: ".product-title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeLidl = createScraper(
  "Lidl",
  "https://www.lidl.fr/q/search?q={q}",
  "https://www.lidl.fr",
  {
    item: ".product-grid-box",
    title: ".title",
    price: ".price-pill",
    link: "a",
    img: "img",
  },
);
const scrapeAction = createScraper(
  "Action",
  "https://www.action.com/fr-fr/search/?q={q}",
  "https://www.action.com",
  {
    item: ".product-card",
    title: ".product-card__title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeGiFi = createScraper(
  "GiFi",
  "https://www.gifi.fr/recherche?q={q}",
  "https://www.gifi.fr",
  {
    item: ".product-item",
    title: ".name",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeCarrefour = createScraper(
  "Carrefour",
  "https://www.carrefour.fr/s?q={q}",
  "https://www.carrefour.fr",
  {
    item: ".product-card",
    title: ".product-card-title",
    price: ".product-price",
    link: "a",
    img: "img",
  },
);
const scrapeAuchan = createScraper(
  "Auchan",
  "https://www.auchan.fr/recherche?text={q}",
  "https://www.auchan.fr",
  {
    item: ".product-thumbnail",
    title: ".product-thumbnail__title",
    price: ".product-price",
    link: "a",
    img: "img",
  },
);
const scrapeLeclerc = createScraper(
  "E.Leclerc",
  "https://www.e.leclerc/recherche?q={q}",
  "https://www.e.leclerc",
  {
    item: ".product-card",
    title: ".product-title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeCultura = createScraper(
  "Cultura",
  "https://www.cultura.com/search.html?q={q}",
  "https://www.cultura.com",
  {
    item: ".product-miniature",
    title: ".product-title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeMicromania = createScraper(
  "Micromania",
  "https://www.micromania.fr/recherche?q={q}",
  "https://www.micromania.fr",
  {
    item: ".product-tile",
    title: ".link",
    price: ".sales",
    link: "a.link",
    img: "img.tile-image",
  },
);

// Occasion & Reconditionné
const scrapeBackMarket = createScraper(
  "BackMarket",
  "https://www.backmarket.fr/fr-fr/search?q={q}",
  "https://www.backmarket.fr",
  { item: ".productCard", title: "h2", price: ".price", link: "a", img: "img" },
);
const scrapeEasyCash = createScraper(
  "EasyCash",
  "https://www.easycash.fr/recherche/produits?q={q}",
  "https://www.easycash.fr",
  {
    item: ".product-item",
    title: ".title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeCashExpress = createScraper(
  "CashExpress",
  "https://www.cashexpress.fr/recherche.html?q={q}",
  "https://www.cashexpress.fr",
  {
    item: ".product-item",
    title: ".title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeRecommerce = createScraper(
  "Recommerce",
  "https://www.recommerce.com/fr/search?q={q}",
  "https://www.recommerce.com",
  {
    item: ".product-card",
    title: ".title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeAsgoodasnew = createScraper(
  "Asgoodasnew",
  "https://asgoodasnew.fr/search?q={q}",
  "https://asgoodasnew.fr",
  {
    item: ".product-item",
    title: ".product-title",
    price: ".price",
    link: "a",
    img: "img",
  },
);

// Imports / Chinois / Autres
const scrapeAliExpress = createScraper(
  "AliExpress",
  "https://fr.aliexpress.com/w/wholesale-{q}.html",
  "https://fr.aliexpress.com",
  {
    item: ".search-item-card-wrapper-gallery",
    title: ".multi--titleText",
    price: ".multi--price",
    link: "a",
    img: "img",
  },
);
const scrapeBanggood = createScraper(
  "Banggood",
  "https://www.banggood.com/buy/{q}.html",
  "https://www.banggood.com",
  { item: ".p-wrap", title: ".title", price: ".price", link: "a", img: "img" },
);
const scrapeGeekbuying = createScraper(
  "Geekbuying",
  "https://www.geekbuying.com/search?keyword={q}",
  "https://www.geekbuying.com",
  {
    item: ".search_result_item",
    title: ".name",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeAlternate = createScraper(
  "Alternate",
  "https://www.alternate.fr/listing.xhtml?q={q}",
  "https://www.alternate.fr",
  {
    item: ".product-box",
    title: ".product-name",
    price: ".price",
    link: "a",
    img: "img",
  },
);

// Brico / Maison
const scrapeLeroyMerlin = createScraper(
  "LeroyMerlin",
  "https://www.leroymerlin.fr/recherche?q={q}",
  "https://www.leroymerlin.fr",
  {
    item: ".product-card",
    title: ".title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeCastorama = createScraper(
  "Castorama",
  "https://www.castorama.fr/search?term={q}",
  "https://www.castorama.fr",
  {
    item: ".product-card",
    title: ".title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeBricoDepot = createScraper(
  "Brico Dépôt",
  "https://www.bricodepot.fr/recherche/?q={q}",
  "https://www.bricodepot.fr",
  {
    item: ".product-list-item",
    title: ".title",
    price: ".price",
    link: "a",
    img: "img",
  },
);
const scrapeTradeDiscount = createScraper(
  "TradeDiscount",
  "https://www.tradediscount.com/catalogsearch/result/?q={q}",
  "https://www.tradediscount.com",
  {
    item: ".item",
    title: ".product-name",
    price: ".price",
    link: "a",
    img: "img",
  },
);

// ─── ROUTE PRINCIPALE ─────────────────────────────────────────────────────────
app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ results: [], logs: [] });

  const key = query.toLowerCase().trim();
  const cached = cache.get(key);
  if (cached) {
    console.log(`[cache] ${key}`);
    return res.json(cached);
  }

  console.log(`[search] "${query}"`);
  const start = Date.now();

  const sites = [
    "eBay",
    "Fnac",
    "Rakuten",
    "Cdiscount",
    "Boulanger",
    "Darty",
    "LDLC",
    "Materiel.net",
    "RueDuCommerce",
    "Decathlon",
    "Amazon",
    "ElectroDepot",
    "Grosbill",
    "Cybertek",
    "TopAchat",
    "MacWay",
    "Infomax",
    "PowerLab",
    "SonVideo",
    "Ubaldi",
    "Conforama",
    "Lidl",
    "Action",
    "GiFi",
    "Carrefour",
    "Auchan",
    "Leclerc",
    "Cultura",
    "Micromania",
    "BackMarket",
    "EasyCash",
    "CashExpress",
    "Recommerce",
    "Asgoodasnew",
    "AliExpress",
    "Banggood",
    "Geekbuying",
    "Alternate",
    "LeroyMerlin",
    "Castorama",
    "BricoDepot",
    "TradeDiscount",
  ];

  const resultsArrays = await Promise.all([
    wrap(scrapeEbay(query), "eBay"),
    wrap(scrapeFnac(query), "Fnac"),
    wrap(scrapeRakuten(query), "Rakuten"),
    wrap(scrapeCdiscount(query), "Cdiscount"),
    wrap(scrapeBoulanger(query), "Boulanger"),
    wrap(scrapeDarty(query), "Darty"),
    wrap(scrapeLDLC(query), "LDLC"),
    wrap(scrapeMaterielNet(query), "Materiel.net"),
    wrap(scrapeRueduCommerce(query), "RueDuCommerce"),
    wrap(scrapeDecathlon(query), "Decathlon"),
    wrap(scrapeAmazon(query), "Amazon"),
    wrap(scrapeElectroDepot(query), "ElectroDepot"),
    wrap(scrapeGrosbill(query), "Grosbill"),
    wrap(scrapeCybertek(query), "Cybertek"),
    wrap(scrapeTopAchat(query), "TopAchat"),
    wrap(scrapeMacWay(query), "MacWay"),
    wrap(scrapeInfomax(query), "Infomax"),
    wrap(scrapePowerLab(query), "PowerLab"),
    wrap(scrapeSonVideo(query), "SonVideo"),
    wrap(scrapeUbaldi(query), "Ubaldi"),
    wrap(scrapeConforama(query), "Conforama"),
    wrap(scrapeLidl(query), "Lidl"),
    wrap(scrapeAction(query), "Action"),
    wrap(scrapeGiFi(query), "GiFi"),
    wrap(scrapeCarrefour(query), "Carrefour"),
    wrap(scrapeAuchan(query), "Auchan"),
    wrap(scrapeLeclerc(query), "Leclerc"),
    wrap(scrapeCultura(query), "Cultura"),
    wrap(scrapeMicromania(query), "Micromania"),
    wrap(scrapeBackMarket(query), "BackMarket"),
    wrap(scrapeEasyCash(query), "EasyCash"),
    wrap(scrapeCashExpress(query), "CashExpress"),
    wrap(scrapeRecommerce(query), "Recommerce"),
    wrap(scrapeAsgoodasnew(query), "Asgoodasnew"),
    wrap(scrapeAliExpress(query), "AliExpress"),
    wrap(scrapeBanggood(query), "Banggood"),
    wrap(scrapeGeekbuying(query), "Geekbuying"),
    wrap(scrapeAlternate(query), "Alternate"),
    wrap(scrapeLeroyMerlin(query), "LeroyMerlin"),
    wrap(scrapeCastorama(query), "Castorama"),
    wrap(scrapeBricoDepot(query), "BricoDepot"),
    wrap(scrapeTradeDiscount(query), "TradeDiscount"),
  ]);

  const logs = sites.map((site, index) => ({
    site,
    count: resultsArrays[index] ? resultsArrays[index].length : 0,
  }));

  const all = resultsArrays
    .flat()
    .filter((r) => r?.value && r?.title)
    .sort((a, b) => a.value - b.value);

  console.log(`[search] ${all.length} résultats en ${Date.now() - start}ms`);

  const responseData = { results: all, logs };
  cache.set(key, responseData);
  res.json(responseData);
});

// ─── EMAIL ────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER || "TON_EMAIL@gmail.com",
    pass: process.env.MAIL_PASS || "TON_MOT_DE_PASSE_APPLICATION",
  },
});

app.post("/api/send-email", async (req, res) => {
  const { email, results, query } = req.body;
  const top = (results || []).slice(0, 10);
  try {
    await transporter.sendMail({
      from: `"SmartPrice" <${process.env.MAIL_USER || "TON_EMAIL@gmail.com"}>`,
      to: email,
      subject: `Top offres pour : ${query}`,
      html:
        `<h2 style="color:#2563eb">🔍 SmartPrice — Top offres pour "${query}"</h2>` +
        top
          .map(
            (r, i) =>
              `<p><b>#${i + 1} ${r.site}</b> — ${r.price}<br/><a href="${r.link}">Voir l'offre</a></p>`,
          )
          .join(""),
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// ─── Frontend HTML ────────────────────────────────────────────────────────────
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
        .product-img { width: 120px; height: 120px; object-fit: contain; margin-bottom: 15px; align-self: center; }
        .price-tag { font-size: 2rem; font-weight: 900; color: #0f172a; margin: 15px 0; }
        
        #loader { display: none; text-align: center; padding: 60px; }
        .spinner { width: 60px; height: 60px; border: 6px solid #e2e8f0; border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: translateY(0); } }
        
        #emailZone { display: none; background: #eff6ff; padding: 25px; border-radius: 20px; margin: 30px 0; border: 2px dashed var(--primary); text-align: center; gap: 15px; }
        
        /* Styles pour les logs */
        #logsPanel { display: none; background: white; padding: 25px; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 30px; animation: slideUp 0.3s ease-out; }
        .log-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-top: 15px; }
        .log-item { padding: 10px 15px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; }
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
                <button class="btn-main" id="logBtn" style="background: var(--silver); display: none; padding: 15px 20px;" onclick="toggleLogs()">📊 Logs</button>
            </div>
        </div>

        <div id="logsPanel">
            <h3 style="margin: 0; color: var(--text);">Statut du Scraping (42 sites)</h3>
            <div class="log-grid" id="logsContent"></div>
        </div>

        <div id="podium-section">
            <h2 style="text-align: center; font-size: 2.2rem; margin-bottom: 50px;">🏆 Meilleures Offres Trouvées</h2>
            <div class="podium-container" id="podium-content"></div>
        </div>

        <div id="emailZone">
            <strong>📧 Envoyer le Top 10 par mail : </strong>
            <input type="email" id="userMail" placeholder="votre@email.com" style="padding: 10px; border-radius: 8px; border: 1px solid #ddd; width: 250px;">
            <button onclick="sendMail()" style="background: var(--success); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">Recevoir</button>
        </div>

        <div id="loader">
            <div class="spinner"></div>
            <p><strong>Inspection de 42 marchands en cours...</strong><br>Cela peut prendre jusqu'à 8 secondes.</p>
        </div>

        <div id="results" class="results-grid"></div>
    </div>

    <script>
        let lastResults = [];
        function handleEnter(e) { if(e.key === 'Enter') runSearch(); }

        function toggleLogs() {
            const panel = document.getElementById('logsPanel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }

        async function runSearch() {
            const query = document.getElementById('query').value;
            if(!query.trim()) return;
            
            document.getElementById('podium-section').style.display = 'none';
            document.getElementById('emailZone').style.display = 'none';
            document.getElementById('logsPanel').style.display = 'none';
            document.getElementById('logBtn').style.display = 'none';
            document.getElementById('results').innerHTML = '';
            document.getElementById('loader').style.display = 'block';
            
            try {
                const response = await fetch('/api/search', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ query })
                });
                
                const data = await response.json();
                lastResults = data.results || [];
                const logs = data.logs || [];
                
                document.getElementById('loader').style.display = 'none';
                document.getElementById('logBtn').style.display = 'block';
                
                renderLogs(logs);

                if(lastResults.length === 0) { 
                    alert("Aucun produit correspondant trouvé."); 
                    toggleLogs();
                    return; 
                }
                
                document.getElementById('emailZone').style.display = 'block';
                renderPodium(lastResults.slice(0, 3));
                renderResults(lastResults.slice(3));
            } catch(e) {
                alert("Erreur serveur.");
                document.getElementById('loader').style.display = 'none';
            }
        }

        function renderLogs(logs) {
            const container = document.getElementById('logsContent');
            container.innerHTML = logs.map(l => {
                const isSuccess = l.count > 0;
                const color = isSuccess ? 'var(--success)' : '#ef4444';
                const icon = isSuccess ? '✅' : '❌';
                return \`
                    <div class="log-item">
                        <span>\${icon} <strong>\${l.site}</strong></span>
                        <span style="color: \${color}; font-weight: bold;">\${l.count}</span>
                    </div>
                \`;
            }).join('');
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
                const rankClass = item.rank === 1 ? 'first' : (item.rank === 2 ? 'second' : 'third');
                const div = document.createElement('div');
                div.className = "podium-item " + rankClass;
                div.innerHTML = \`
                    <div class="medal-badge medal-\${item.rank}">\${item.icon}</div>
                    <img src="\${item.data.image}" class="product-img" onerror="this.style.display='none'">
                    <div style="font-weight:bold; color:var(--primary)">\${item.data.site}</div>
                    <div class="price-tag">\${item.data.price}</div>
                    <a href="\${item.data.link}" target="_blank" style="color:var(--primary); font-weight:bold; text-decoration:none;">Voir l'offre</a>
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
                    <img src="\${item.image}" class="product-img" onerror="this.style.display='none'">
                    <div class="price-tag">\${item.price}</div>
                    <a href="\${item.link}" target="_blank" style="color:var(--primary); text-decoration:none; font-size:0.9rem;">Détails</a>
                \`;
                resDiv.appendChild(card);
            });
        }

        async function sendMail() {
            const email = document.getElementById('userMail').value;
            if(!email.includes('@')) return alert("Email invalide");
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email, results: lastResults, query: document.getElementById('query').value })
            });
            if(res.ok) alert("✅ Mail envoyé !");
        }
    </script>
</body>
</html>
`;

app.get("/", (_, res) => res.send(htmlContent));
app.listen(PORT, () =>
  console.log(`\n✅ SmartPrice est lancé et prêt : http://localhost:${PORT}\n`),
);
