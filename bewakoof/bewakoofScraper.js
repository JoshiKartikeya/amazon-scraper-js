import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

import { queue } from "../queue.js";
import { saveItem } from "./bewakoof-db.js";

const fashion_keywords = ["men shirts" , "pant", "track pant", "bandana", "trendy jackets", "oversized t-shirts", "boho tops",
        "trousers for men", "men capri", "men sweat shirt", "half sleeve shirt", "cap for men", "men slim fit jeans",
        "women shirts", "women kurtis", "ethnic dresses", "sportswear", "hoodies for men", "crop tops",
        "maxi dresses", "flared skirts", "trousers for women", "jeans for men", "track pants", "chinos", "joggers",
        "cargo pants", "men’s capris", "suits for men", "tuxedos", "sherwanis", "kurta pajama", "men sweatshirts",
        "jackets for men", "blazers", "men t-shirts", "graphic tees", "men’s ethnic wear", "vests", "tank tops",
        "men’s fashion accessories", "men’s watches", "belts for men", "bandanas", "scarves for men", "caps for men",
        "women tops", "oversized shirts", "women’s t-shirts", "women dresses", "maxi dress", "midi dress",
        "bodycon dress", "ethnic wear for women", "sarees", "kurtis", "lehenga choli", "women pants", "leggings",
        "palazzo pants", "culottes", "women jackets", "shrugs", "cardigans", "sweaters for women",
        "women sweatshirts", "women hoodies", "stylish co-ords", "jumpsuits", "skirts", "tunics",
        "women fashion accessories", "handbags", "sling bags", "earrings", "necklaces", "bangles",
        "scarves for women", "trendy heels", "flats", "sneakers for women", "sneakers", "running shoes", "loafers",
        "boots", "sandals", "heels", "flip flops", "formal shoes", "casual shoes", "sports shoes", "winter jackets",
        "summer wear", "raincoats", "trench coats", "oversized clothing", "layering outfits", "streetwear fashion",
        "vintage fashion", "minimalist fashion", "athleisure", "Y2K fashion", "90s fashion", "party wear",
        "beachwear", "festive wear", "sunglasses", "watches", "belts", "hats", "beanies", "bags", "backpacks",
        "wallets", "rings", "bracelets",
        // # Additional clothing types
        "henley t-shirts", "polo shirts", "longline t-shirts", "tankinis", "camisoles", "slip dresses",
        "peplum tops", "tube tops", "ruffle tops", "wrap dresses", "skater dresses", "A-line skirts",
        "pleated skirts", "mini skirts", "pencil skirts", "biker shorts", "paper bag pants", "tie-waist trousers",
        "high-waisted jeans", "ripped jeans", "bootcut jeans", "flare pants", "dhoti pants", "harem pants",
        // # Formal & office wear
        "formal shirts", "office trousers", "business suits", "blouses", "pencil dresses", "sheath dresses",
        "blazer dresses", "waistcoats", "double-breasted blazers", "neckties", "bow ties", "cufflinks",
        // # Ethnic & cultural fashion
        "anarkali suits", "patiala suits", "sharara sets", "angrakha kurtis", "kaftans", "abayas", "hijabs",
        "dupattas", "stoles", "indo-western gowns", "nehru jackets",
        // # Styles & trends
        "gender-neutral clothing", "capsule wardrobe", "monochrome outfits", "color-blocking fashion",
        "printed shirts", "polka dots", "florals", "checks", "stripes", "embroidered wear", "sequinned outfits",
        "metallic finish clothes", "sheer tops", "mesh outfits", "distressed wear", "corset tops", "balloon sleeves",
        "off-shoulder tops", "cold shoulder tops", "one-shoulder dresses", "cowl neck tops", "halter neck tops",
        // # Fabrics & materials
        "cotton wear", "linen outfits", "denim wear", "corduroy", "velvet clothing", "satin dresses", "silk sarees",
        "georgette tops", "chiffon dupattas", "woolen sweaters", "fleece jackets", "faux leather pants",
        "leather jackets", "denim jackets", "knitwear", "crochet tops",
        // # Footwear styles (extended)
        "brogues", "derbies", "oxfords", "mules", "moccasins", "espadrilles", "wedges", "stilettos",
        "peep-toe heels", "gladiator sandals", "platform heels", "ankle boots", "chelsea boots", "combat boots",
        "hiking shoes", "clogs",
        // # Fashion accessories (extra)
        "chokers", "anklets", "nose pins", "hairbands", "scrunchies", "wristbands", "brooches", "tie pins",
        "keychains", "phone slings", "charm bracelets", "fashion masks"];;
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
