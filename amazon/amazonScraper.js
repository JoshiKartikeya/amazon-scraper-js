import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

import { queue } from "../queue.js";
import { saveItem } from "./amazon-db.js";

const fashion_keywords = [
  "men shirts",
  "pant",
  "track pant",
  "bandana",
  "trendy jackets",
  "oversized t-shirts",
  "boho tops",
  "trousers for men",
  "men capri",
  "men sweat shirt",
  "half sleeve shirt",
  "cap for men",
  "men slim fit jeans",
  "women shirts",
  "women kurtis",
  "ethnic dresses",
  "sportswear",
  "hoodies for men",
  "crop tops",
  "maxi dresses",
  "flared skirts",
  "trousers for women",
  "jeans for men",
  "track pants",
  "chinos",
  "joggers",
  "cargo pants",
  "men’s capris",
  "suits for men",
  "tuxedos",
  "sherwanis",
  "kurta pajama",
  "men sweatshirts",
  "jackets for men",
  "blazers",
  "men t-shirts",
  "graphic tees",
  "men’s ethnic wear",
  "vests",
  "tank tops",
  "men’s fashion accessories",
  "men’s watches",
  "belts for men",
  "bandanas",
  "scarves for men",
  "caps for men",
  "women tops",
  "oversized shirts",
  "women’s t-shirts",
  "women dresses",
  "maxi dress",
  "midi dress",
  "bodycon dress",
  "ethnic wear for women",
  "sarees",
  "kurtis",
  "lehenga choli",
  "women pants",
  "leggings",
  "palazzo pants",
  "culottes",
  "women jackets",
  "shrugs",
  "cardigans",
  "sweaters for women",
  "women sweatshirts",
  "women hoodies",
  "stylish co-ords",
  "jumpsuits",
  "skirts",
  "tunics",
  "women fashion accessories",
  "handbags",
  "sling bags",
  "earrings",
  "necklaces",
  "bangles",
  "scarves for women",
  "trendy heels",
  "flats",
  "sneakers for women",
  "sneakers",
  "running shoes",
  "loafers",
  "boots",
  "sandals",
  "heels",
  "flip flops",
  "formal shoes",
  "casual shoes",
  "sports shoes",
  "winter jackets",
  "summer wear",
  "raincoats",
  "trench coats",
  "oversized clothing",
  "layering outfits",
  "streetwear fashion",
  "vintage fashion",
  "minimalist fashion",
  "athleisure",
  "Y2K fashion",
  "90s fashion",
  "party wear",
  "beachwear",
  "festive wear",
  "sunglasses",
  "watches",
  "belts",
  "hats",
  "beanies",
  "bags",
  "backpacks",
  "wallets",
  "rings",
  "bracelets",
  "henley t-shirts",
  "polo shirts",
  "longline t-shirts",
  "tankinis",
  "camisoles",
  "slip dresses",
  "peplum tops",
  "tube tops",
  "ruffle tops",
  "wrap dresses",
  "skater dresses",
  "A-line skirts",
  "pleated skirts",
  "mini skirts",
  "pencil skirts",
  "biker shorts",
  "paper bag pants",
  "tie-waist trousers",
  "high-waisted jeans",
  "ripped jeans",
  "bootcut jeans",
  "flare pants",
  "dhoti pants",
  "harem pants",
  "formal shirts",
  "office trousers",
  "business suits",
  "blouses",
  "pencil dresses",
  "sheath dresses",
  "blazer dresses",
  "waistcoats",
  "double-breasted blazers",
  "neckties",
  "bow ties",
  "cufflinks",
  "anarkali suits",
  "patiala suits",
  "sharara sets",
  "angrakha kurtis",
  "kaftans",
  "abayas",
  "hijabs",
  "dupattas",
  "stoles",
  "indo-western gowns",
  "nehru jackets",
  "gender-neutral clothing",
  "capsule wardrobe",
  "monochrome outfits",
  "color-blocking fashion",
  "printed shirts",
  "polka dots",
  "florals",
  "checks",
  "stripes",
  "embroidered wear",
  "sequinned outfits",
  "metallic finish clothes",
  "sheer tops",
  "mesh outfits",
  "distressed wear",
  "corset tops",
  "balloon sleeves",
  "off-shoulder tops",
  "cold shoulder tops",
  "one-shoulder dresses",
  "cowl neck tops",
  "halter neck tops",
  "cotton wear",
  "linen outfits",
  "denim wear",
  "corduroy",
  "velvet clothing",
  "satin dresses",
  "silk sarees",
  "georgette tops",
  "chiffon dupattas",
  "woolen sweaters",
  "fleece jackets",
  "faux leather pants",
  "leather jackets",
  "denim jackets",
  "knitwear",
  "crochet tops",
  "brogues",
  "derbies",
  "oxfords",
  "mules",
  "moccasins",
  "espadrilles",
  "wedges",
  "stilettos",
  "peep-toe heels",
  "gladiator sandals",
  "platform heels",
  "ankle boots",
  "chelsea boots",
  "combat boots",
  "hiking shoes",
  "clogs",
  "chokers",
  "anklets",
  "nose pins",
  "hairbands",
  "scrunchies",
  "wristbands",
  "brooches",
  "tie pins",
  "keychains",
  "phone slings",
  "charm bracelets",
  "fashion masks",
];
const START_URLS = fashion_keywords.map(
  (fk) => `https://www.amazon.in/s?k=${encodeURIComponent(fk)}`
);

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
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
  await browser.close();
  process.exit(0);
})();

async function crawlListing(url, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );
  await page.goto(url, { waitUntil: "networkidle2" });

  const links = await page.$$eval(
    'div.s-main-slot a.a-link-normal[href*="/dp/"]',
    (els) => Array.from(new Set(els.map((a) => a.href.split("?")[0])))
  );
  console.log(`🔗 Found ${links.length} items on ${url}`);

  for (const link of links) {
    queue.add(() => crawlProduct(link, browser));
  }

  const nextHref = await page
    .$eval("a.s-pagination-next", (a) => a.href)
    .catch(() => null);
  if (nextHref) queue.add(() => crawlListing(nextHref, browser));

  await page.close();
}

async function crawlProduct(url, browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );

  try {
    await page.goto(url, { waitUntil: "networkidle2" });

    const item = await page.evaluate(() => {
      function extractASIN(link) {
        const patterns = [
          /\/dp\/([A-Z0-9]{10})/,
          /\/gp\/product\/([A-Z0-9]{10})/,
          /\/product\/([A-Z0-9]{10})/,
          /\/([A-Z0-9]{10})(?:[/?]|$)/,
        ];
        for (const pattern of patterns) {
          const match = link.match(pattern);
          if (match) return match[1];
        }
        return null;
      }

      const link = location.href;

      const titleEl = document.querySelector(
        "#productTitle, h2.a-size-base-plus span"
      );
      const title = titleEl?.textContent.trim() || "Unknown Title";

      const priceRaw = document.querySelector(
        "span.a-price span.a-price-whole"
      );
      const price = parseInt(priceRaw?.textContent.replace(/[₹,]/g, "").trim());

      const rating = parseFloat(
        document.querySelector("span.a-size-base")?.textContent.trim()
      );

      const categoryEls = Array.from(
        document.querySelectorAll(
          "#wayfinding-breadcrumbs_feature_div ul.a-unordered-list li span.a-list-item a"
        )
      );
      const categories = categoryEls
        .map((el) => el.textContent.trim())
        .filter(Boolean);

      const image = document.querySelector("img#landingImage")?.src;

      let asin = null;
      const detailItems = Array.from(
        document.querySelectorAll(
          "#detailBullets_feature_div li span.a-list-item"
        )
      );
      for (const item of detailItems) {
        const label = item
          .querySelector("span.a-text-bold")
          ?.textContent?.trim();
        if (label && label.toLowerCase().includes("asin")) {
          asin = item
            .querySelector("span:not(.a-text-bold)")
            ?.textContent?.trim();
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
        image,
      };
    });

    if (!item.asin) {
      console.warn(`⚠️ ASIN missing for ${url}`);
      return;
    }

    if (!item.title) {
      item.title = "Unknown Title";
    }

    await saveItem(item);
  } catch (err) {
    console.error(`❌ Error scraping product: ${url}`, err);
  }

  await page.close();
}
