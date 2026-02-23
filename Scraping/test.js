const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log("Navigation vers le site de test...");
  await page.goto(
    "http://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  );

  // On attend la classe ".price_color" qui existe sur ce site
  await page.waitForSelector(".price_color");

  const prix = await page.innerText(".price_color");

  console.log("---------------------------------");
  console.log("LE PRIX DU LIVRE EST : " + prix);
  console.log("---------------------------------");

  await page.waitForTimeout(5000);
  await browser.close();
})();
