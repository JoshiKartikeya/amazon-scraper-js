import puppeteer from "puppeteer";
import { queue } from "../queue.js";

const keywords = ["pant"];
const START_URLS = keywords.map(
  (k) => `https://www.flipkart.com/search?q=${encodeURIComponent(k)}%20&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=on&as=off`
);

async function scraper() {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--window-size=1920,1080",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
    ],
  });
  for (const url of START_URLS) {
    queue.add(() => crawlListing(url, browser));
  }
  await queue.onIdle();
//   await browser.close();
//   process.exit(0);
}
scraper();

async function crawlListing(url, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );
  await page.goto(url, { waitUntil: "networkidle2" });
//   const links = await page.$$eval(
//     document.querySelectorAll('a[href*="/product/"]'),
//   )
}
