import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();

import { queue } from '../queue.js';
import { saveItem } from './giva-db.js';

const fashion_keywords = ["tops"];
const START_URLS = fashion_keywords.map(fk => `https://www.giva.co/search?q=${encodeURIComponent(fk)}`);

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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2' });

    const links = await page.$$eval(
        '#retail-search-result li div.card__information h3.card__heading.h5 a[href*="/products/"]',
        els => Array.from(new Set(els.map(a => a.href.split("?")[0])))
    );
    console.log(`🔗 Found ${links.length} items on ${url}`);

    for (const link of links) {
        queue.add(() => crawlProduct(link, browser));
    }

    // const nextHref = await page.$eval('a.s-pagination-next', a => a.href).catch(() => null);
    // if (nextHref) queue.add(() => crawlListing(nextHref, browser));

    await page.close();
}

async function crawlProduct(url, browser) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        const item = await page.evaluate(() => {

            const link = location.href;
            const pid = link.split('/products/')[1]?.split('/')[0];

            const titleEl = document.querySelector('div.product__title h2.main__title');
            const title = titleEl?.textContent.trim() || 'Unknown title';

            const priceRaw = document.querySelector('div.price__sale span.price-item.price-item--sale.price-item--last');
            const price = parseInt(priceRaw?.textContent.replace(/[₹,]/g, '').trim()) || 0

            const ratingSpan = document.querySelectorAll('a.product-ratings span')[1];
            const ratingText = ratingSpan?.textContent.replace(/[()]/g, '');
            const rating = parseFloat(ratingText?.split('|')[0].trim()) || 0;


            const image = document.querySelector('div.card__media div.media.media--transparent.media--hover-effect img')?.src ;

            return {
                pid,
                title,
                price,
                rating,
                link,
                image
            };
        });

        await saveItem(item);

    } catch (err) {
        console.error(`❌ Error scraping product: ${url}`, err);
    }

    await page.close();
}
