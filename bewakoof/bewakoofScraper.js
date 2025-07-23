import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();

import { queue } from '../queue.js';
import { saveItem } from './bewakoof-db.js';

const fashion_keywords = ["shirts"];
const START_URLS = fashion_keywords.map(fk => `https://www.bewakoof.com/search?q=${encodeURIComponent(fk)}`);

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

    const links = await page.$$eval(
        'section.sc-42fe7e14-2 section.sc-37cd539d-4.jXlIPn a[href*="/p/"]',
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

            const titleEl = document.querySelector('div.sc-3507519-0.jdbagT div span.sc-52aa9520-0.dAPRcV');
            const title = titleEl?.textContent.trim() || '';

            const priceRaw = document.querySelector('div.sc-fb1f0418-2.WukCp div div h3.sc-df740a4c-0.gkeKtZ');
            const price = parseInt(priceRaw?.textContent.replace(/[₹,]/g, '').trim()) || 0

            const rating = parseFloat(document.querySelector('div.sc-3507519-1.efsGCY div div.sc-5e347dd4-0.dkpkHH span.sc-52aa9520-0.bDUNpX')?.textContent.trim())

            const categoryEls = Array.from(document.querySelectorAll('section.sc-4c02ae60-0.cfbEUq div.sc-4c02ae60-1.eJlDaG a span'));
            const categories = categoryEls.map(el => el.textContent.trim()).filter(Boolean);

            const image = document.querySelector('div.swiper-slide.swiper-slide-active div.swiper-zoom-container img')?.src || '' ;

            return {
                pid,
                title,
                price,
                rating,
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
