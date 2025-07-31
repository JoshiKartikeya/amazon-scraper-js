import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();

import { queue } from '../queue.js';
import { saveItem } from './bluestone-db.js';

const fashion_keywords = ["rings"];
const START_URLS = fashion_keywords.map(fk => `https://www.bluestone.com/search?search_query=${encodeURIComponent(fk)}`);

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
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

    await autoScroll(page);

    const links = await page.$$eval(
        'ul.product-grid.search-box-result li',
        els => Array.from(new Set(
            els.map(el => el.getAttribute('data-url'))
        ))
    );

    console.log(`🔗 Found ${links.length} items on ${url}`);

    for (const link of links) {
        if (link) {
            const fullUrl = link.startsWith('http') ? link : `https://www.bluestone.com${link}`;
            queue.add(() => crawlProduct(fullUrl, browser));
        }
    }

    await page.close();
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        let previousHeight = 0;
        let retries = 0;

        while (retries < 5) {
            window.scrollBy(0, window.innerHeight);
            await delay(500);

            const currentHeight = document.body.scrollHeight;

            if (currentHeight === previousHeight) {
                retries++;
            } else {
                retries = 0;
                previousHeight = currentHeight;
            }
        }
    });
}

async function crawlProduct(url, browser) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        const item = await page.evaluate(() => {

            const link = location.href;
            const pCode = document.querySelector('#item-details #section-item-details div.content dl #detail-product-code')?.textContent.trim();

            const titleEl = document.querySelector('div.content div.sub-title div.desc span');
            const title = titleEl?.textContent.trim() || 'Unknown title';

            const priceRaw = document.querySelector('div.content div.discountedprice-offer span.final-pd-price');
            const price = parseInt(priceRaw?.textContent.replace(/,/g, '').trim()) || ''

            const categoryEls = Array.from(document.querySelectorAll('#breadcrumb ul a span'));
            const categories = categoryEls.map(el => el.textContent.trim()).filter(Boolean);

            const image = document.querySelector('#wrap a img')?.src ;

            return {
                pCode,
                title,
                price,
                categories,
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
