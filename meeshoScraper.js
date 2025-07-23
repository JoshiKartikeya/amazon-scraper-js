import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();

import { queue } from './queue.js';
import { saveItem } from './meesho-db.js';

const fashion_keywords = ["shirts"];
const START_URLS = fashion_keywords.map(fk => `https://www.meesho.com/search?q=${encodeURIComponent(fk)}`);

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
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
        'div.products div.sc-dkrFOg a[href*="/p/"]',
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
            const pid = link.split('/p/')[1]?.split('/')[0];

            const titleEl = document.querySelector('h1.sc-eDvSVe.fhfLdV');
            const title = titleEl?.textContent.trim() || '';

            const priceRaw = document.querySelector('div.sc-iBYQkv h4.sc-eDvSVe');
            const price = parseInt(priceRaw?.textContent.replace(/[₹,]/g, '').trim()) || 0

            // const rating = parseFloat(document.querySelector('span.a-size-base')?.textContent.trim())
            //
            // const categoryEls = Array.from(document.querySelectorAll('#wayfinding-breadcrumbs_feature_div ul.a-unordered-list li span.a-list-item a'));
            // const categories = categoryEls.map(el => el.textContent.trim()).filter(Boolean);
            //
            const image = document.querySelector('div.czNIkn picture img')?.src ;

            return {
                pid,
                title,
                price,
                // rating,
                // categories,
                link,
                image
            };
        });


        // if (!item.title) {
        //     item.title = 'Unknown Title';
        // }

        await saveItem(item);

    } catch (err) {
        console.error(`❌ Error scraping product: ${url}`, err);
    }

    await page.close();
}
