// db.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function saveItem(item) {
  try {
    await prisma.test_amazon_fashion_data.upsert({
      where: { asin: item.asin },
      create: {
        asin:       item.asin,
        title:      item.title,
        price:      item.price,
        categories: item.categories,
        rating:     item.rating,
        link:       item.link,
        image_link:  item.image,
      },
      update: {
        title:      item.title,
        price:      item.price,
        categories: item.categories,
        rating:     item.rating,
        link:       item.link,
        image_link:  item.image,
      },
    });
    console.log(`✅ Saved ASIN ${item.asin}`);
  } catch (e) {
    console.error(`❌ Prisma error for ${item.asin}:`, e.message);
  }
}
