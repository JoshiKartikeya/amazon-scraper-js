import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();

import { queue } from './queue.js';
import { saveItem } from './db.js';

const fashion_keywords = ["men shirts"];
const START_URLS = fashion_keywords.map(fk => `https://www.amazon.in/s?k=${encodeURIComponent(fk)}`);

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-features=UseOzonePlatform',
      '--disable-gpu',
      '--disable-software-rasterizer',
    ]
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
  await page.goto(url, { waitUntil: 'networkidle2' });

  const links = await page.$$eval(
    'div.s-main-slot a.a-link-normal[href*="/dp/"]',
    els => Array.from(new Set(els.map(a => a.href.split("?")[0])))
  );
  console.log(`🔗 Found ${links.length} items on ${url}`);

  for (const link of links) {
    queue.add(() => crawlProduct(link, browser));
  }

  const nextHref = await page.$eval('a.s-pagination-next', a => a.href).catch(() => null);
  if (nextHref) queue.add(() => crawlListing(nextHref, browser));

  await page.close();
}

async function crawlProduct(url, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto(url, { waitUntil: 'networkidle2' });

const item = await page.evaluate(() => {
  function extractASIN(link) {
    const patterns = [
      /\/dp\/([A-Z0-9]{10})/,
      /\/gp\/product\/([A-Z0-9]{10})/,
      /\/product\/([A-Z0-9]{10})/,
      /\/([A-Z0-9]{10})(?:[/?]|$)/
    ];
    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  const link = location.href;

  const titleEl = document.querySelector('#productTitle, h2.a-size-base-plus span');
  const title = titleEl?.textContent.trim() || 'Unknown Title';

  const priceRaw = document.querySelector('span.a-price span.a-price-whole');
  const price = parseInt(priceRaw?.textContent.replace(/[₹,]/g, '').trim())

  const rating = parseFloat(document.querySelector('span.a-size-base')?.textContent.trim())

  const categoryEls = Array.from(document.querySelectorAll('#wayfinding-breadcrumbs_feature_div ul.a-unordered-list li span.a-list-item a'));
  const categories = categoryEls.map(el => el.textContent.trim()).filter(Boolean);

  const image = document.querySelector('img#landingImage')?.src;

  let asin = null;
  const detailItems = Array.from(document.querySelectorAll('#detailBullets_feature_div li span.a-list-item'));
  for (const item of detailItems) {
    const label = item.querySelector('span.a-text-bold')?.textContent?.trim();
    if (label && label.toLowerCase().includes('asin')) {
      asin = item.querySelector('span:not(.a-text-bold)')?.textContent?.trim();
      break;
    }
  }

  if (!asin) {
    asin = extractASIN(link);
  }

  return {
    asin,
    title,
    price,
    rating,
    categories,
    link,
    image
  };
});


    if (!item.asin) {
      console.warn(`⚠️ ASIN missing for ${url}`);
      return;
    }

    if (!item.title) {
      item.title = 'Unknown Title';
    }

    await saveItem(item);

  } catch (err) {
    console.error(`❌ Error scraping product: ${url}`, err);
  }

  await page.close();
}
