import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

import { queue } from "../queue.js";
import { saveItem } from "./bewakoof-db.js";

const fashion_keywords = ["shirts"];
const START_URLS = fashion_keywords.map(
  (fk) => `https://www.bewakoof.com/search?q=${encodeURIComponent(fk)}`
);

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-features=UseOzonePlatform",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ],
  });

  for (const url of START_URLS) {
    queue.add(() => crawlListing(url, browser));
  }

  await queue.onIdle();
  await browser.close();
  process.exit(0);
})();

async function crawlListing(url, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  await page.goto(url, { waitUntil: "networkidle2" });

  const links = await page.$$eval('a[data-testid="product-card-link"]', (els) =>
    Array.from(new Set(els.map((a) => a.href.split("?")[0])))
  );
  console.log(`🔗 Found ${links.length} items on ${url}`);

  for (const link of links) {
    queue.add(() => crawlProduct(link, browser));
  }

  await page.close();
}

async function crawlProduct(url, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto(url, { waitUntil: "networkidle2" });

    const item = await page.evaluate(() => {
      const link = location.href;
      const pid = link.split("/p/")[1]?.split("/")[0];

      const titleEl = document.querySelector(
        'section[data-testid = "pdp-details-section"]> div > div > span'
      );
      const title = titleEl?.textContent.trim() || "";

      const priceRaw = document.querySelector(
        'div[data-testid="product-price-wrapper"] h3[data-testid = "current-price"]'
      );
      const price =
        parseInt(priceRaw?.textContent.replace(/[₹,]/g, "").trim());

      const categories = (() => {
        const categoryEls = document.querySelectorAll(
          'section[data-testid="breadcrumb-wrapper"] div'
        );
        const result = [];

        categoryEls.forEach((el) => {
          if (el.querySelector(".breadcrum-seperator-icon")) {
            const text = el.querySelector("span")?.innerText;
            if (text) result.push(text);
          }
        });

        return result;
      })();

      const image =
        document.querySelector("img[data-testid='custom-image']")?.src;

      return {
        pid,
        title,
        price,
        categories,
        link,
        image,
      };
    });

    await saveItem(item);
  } catch (err) {
    console.error(`❌ Error scraping product: ${url}`, err);
  }

  await page.close();
}
