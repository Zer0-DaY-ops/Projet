const express = require("express");
const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
const path = require("path");

chromium.use(stealth);
const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const SITES_CONFIG = [
  {
    name: "Amazon FR",
    url: "https://www.amazon.fr/s?k=",
    container: ".s-result-item[data-component-type='s-search-result']",
    price: ".a-price-whole",
    link: "h2 a",
    image: ".s-image",
    title: "h2 a span",
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
    baseUrl: "",
  },
];

function isValidProduct(title, price, query) {
  const lowerTitle = title.toLowerCase();
  const forbidden = ["jeu", "manette", "housse", "cable", "protection", "case"];
  if (forbidden.some((word) => lowerTitle.includes(word)) && price < 100)
    return false;
  return true;
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/api/search", async (req, res) => {
  const { query } = req.body;
  const browser = await chromium.launch({ headless: true });
  let results = [];

  try {
    for (const site of SITES_CONFIG) {
      const page = await browser.newPage();
      try {
        await page.goto(site.url + encodeURIComponent(query), {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });
        await page.waitForSelector(site.container, { timeout: 8000 });

        const data = await page.evaluate((conf) => {
          const items = Array.from(document.querySelectorAll(conf.container));
          return items.slice(0, 5).map((x) => ({
            p: x.querySelector(conf.price)?.innerText || "0",
            t: x.querySelector(conf.title)?.innerText || "Produit",
            l: x.querySelector(conf.link)?.getAttribute("href"),
            img: x.querySelector(conf.image)?.getAttribute("src"),
          }));
        }, site);

        data.forEach((item) => {
          const val = parseFloat(
            item.p.replace(/[^\d,.]/g, "").replace(",", "."),
          );
          if (val > 0 && isValidProduct(item.t, val, query)) {
            results.push({
              site: site.name,
              price: val,
              title: item.t,
              link: item.l?.startsWith("http") ? item.l : site.baseUrl + item.l,
              image: item.img,
            });
          }
        });
      } catch (e) {
        console.log(`Erreur sur ${site.name}`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  results.sort((a, b) => a.price - b.price);
  res.json({ results });
});

app.listen(3000, () => console.log("🚀 SmartPrice sur http://localhost:3000"));
