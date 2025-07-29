import puppeteer from "puppeteer";
import dotenv from "dotenv";
import { queue } from "../queue.js";
import { saveItem } from "./flipkart-db.js";
dotenv.config();

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
const zeroPageTracker = new Map(); 

const START_URLS = fashion_keywords.map(
  (k) =>
    `https://www.flipkart.com/search?q=${encodeURIComponent(
      k
    )}&otracker=search&otracker1=search&marketplace=FLIPKART&as-show=on&as=off&page=1`
);

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
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

    const urlObj = new URL(url);
    const query = urlObj.searchParams.get("q");
    const pageNum = parseInt(urlObj.searchParams.get("page") || "1");
    const key = `${query}`;

    if (links.length === 0) {
      const prev = zeroPageTracker.get(key) || 0;
      zeroPageTracker.set(key, prev + 1);
    } else {
      zeroPageTracker.set(key, 0); // reset if current page has links
    }

    const zeroCount = zeroPageTracker.get(key);
    if (zeroCount >= 2) {
      console.log(
        `🛑 Stopping: 2 consecutive empty pages for "${query}" starting from page ${
          pageNum - 1
        }`
      );
      await page.close();
      return;
    }

    for (const link of links) {
      queue.add(() => crawlProduct(link, browser));
    }

    const nextPageUrl = url.replace(/&page=\d+/, `&page=${pageNum + 1}`);
    queue.add(() => crawlListing(nextPageUrl, browser));
  } catch (err) {
    console.error(`❌ Error in crawlListing for ${url}`, err);
  } finally {
    try {
      await page.close();
    } catch (err) {
      if (err.message.includes("No target with given id found")) {
        console.warn("⚠️ Tried to close a page that was already closed.");
      } else {
        throw err;
      }
    }
  }
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
        document.querySelector("img._53J4C-.utBuJY , img.DByuf4.IZexXJ.jLEJ7H")
          ?.src || null;

      const title =
        getText("span.VU-ZEz") || getText("span._35KyD6") || "Unknown Title";
      const priceText = getText("div.Nx9bqj.CxhGGd");
      const price = priceText ? parseInt(priceText.replace(/[₹,]/g, "")) : null;
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
  } finally {
    await page.close();
  }
}
