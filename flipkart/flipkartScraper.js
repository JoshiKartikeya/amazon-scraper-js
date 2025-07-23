import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

import { queue } from "../queue.js";
import { saveItem } from "./flipkart-db.js"; 

const fashion_keywords = ["men shirts"]; 

const START_URLS = fashion_keywords.map(
  (k) =>
    `https://www.flipkart.com/search?q=${encodeURIComponent(k)}&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=on&as=off`
);

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1920,1080",
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
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
  );

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const links = await page.$$eval('a[href*="/p/"]', (els) =>
      Array.from(
        new Set(
          els
            .map((el) => el.href.split("&")[0])
            .filter((href) => href.includes("/p/"))
        )
      )
    );

    console.log(`🔗 Found ${links.length} products on ${url}`);

    for (const link of links) {
      queue.add(() => crawlProduct(link, browser));
    }

    const nextHref = await page
      .$eval("a._1LKTO3", (a) => {
        return a.innerText.includes("Next") ? a.href : null;
      })
      .catch(() => null);

    if (nextHref) queue.add(() => crawlListing(nextHref, browser));
  } catch (err) {
    console.error(`❌ Error in crawlListing for ${url}`, err);
  }

  await page.close();
}

async function crawlProduct(url, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
  );

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const item = await page.evaluate(() => {
      const getText = (selector) =>
        document.querySelector(selector)?.textContent.trim() || null;
      const getImage = () =>
        document.querySelector("img._53J4C-.utBuJY , img.DByuf4.IZexXJ.jLEJ7H")?.src || null;

      const title =
        getText("span.VU-ZEz") || getText("span._35KyD6") || "Unknown Title";
      const priceText = getText("div.Nx9bqj.CxhGGd");
      console.log(`Price Text: ${priceText}`);
      const price = priceText
        ? parseInt(priceText.replace(/[₹,]/g, ""))
        : null;
      const ratingText = getText("div.XQDdHH._1Quie7");
      const rating = ratingText ? parseFloat(ratingText) : null;

      const categories = Array.from(
        document.querySelectorAll("div.r2CdBx")
      ).map((el) => el.textContent.trim()); 

      const image = getImage();
      const link = location.href;

      return { title, price, rating, categories, image, link };
    });


    const pidMatch = url.match(/pid=([A-Z0-9]+)/i);
    const asin = pidMatch ? pidMatch[1] : null;

    if (!asin) {
      console.warn(`⚠️ PID missing for ${url}`);
      return;
    }

    item.asin = asin;

    await saveItem(item);
  } catch (err) {
    console.error(`❌ Error scraping product: ${url}`, err);
  }

  await page.close();
}
