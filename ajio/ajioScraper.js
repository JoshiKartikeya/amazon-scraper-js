import puppeteer from "puppeteer";
import { saveItem } from "./ajio-db.js";

const URL = "https://www.lenskart.com/sunglasses.html";

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractPID(link){
  const match = link.match()
}

async function productInfo(link, browser) {
  const page = await browser.newPage();

  await page.setViewport({ width: 1200, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
  );
  await page.goto(link, {
    waitUntil: "domcontentloaded",
    timeout: 0,
  });

  const productDetails = await page.evaluate(() => {
    const categories = Array.from(
      document.querySelectorAll("li[class*='LI--'] span[class*='BCSpan--'] a")
    ).map((el) => el.innerText.trim());
    return { categories };
  });

  await page.close();
  return productDetails;
}

async function scrapeLenskart() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setViewport({ width: 1200, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
  );
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 0 });

  const collected = new Map();
  let previousCount = 0;
  let stableRounds = 0;

  while (stableRounds < 8) {
    const newProducts = await page.evaluate(() => {
      const productCards = document.querySelectorAll("div.item");
      const items = [];                

      productCards.forEach((card) => {
        const link = card.querySelector("a")?.href;
        const image = card.querySelector("div.img")?.src;
        const rating = parseInt(
          card.querySelector("div.contentHolder p")?.innerText
        );
        const title = card.querySelector("div.nameCls")?.innerText;
        const priceTextRaw =
          card.querySelector("span.price strong")?.innerText;
        const price =
          priceTextRaw && priceTextRaw.match(/\d+/)
            ? parseInt(priceTextRaw.replace(/[₹,]/g, ""))
            : null;
        const pid = extractPID(link);
        const categories = productInfo(link , browser);

        if (pid && link && image && title) {
          items.push({ link, image, rating, title, price, pid, categories });
        }
      });
      return items;
    });

    for (const prod of newProducts) {
      if (!collected.has(prod.link)) {
        const { pid, categories } = await scrapePID(prod.link, browser);
        collected.set(prod.link, { ...prod, pid, categories });
        try {
          await saveItem({ ...prod, pid, categories });
          console.log("Saved to DB:", prod.title);
        } catch (err) {
          console.error("Error saving item:", err.message);
        }
      }
    }

    console.log(`Products collected so far: ${collected.size}`);

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight / 2);
    });
    await delay(3000);

    if (collected.size === previousCount) {
      stableRounds++;
    } else {
      stableRounds = 0;
      previousCount = collected.size;
    }
  }

  const result = Array.from(collected.values());

  await browser.close();
}

scrapeLenskart();
