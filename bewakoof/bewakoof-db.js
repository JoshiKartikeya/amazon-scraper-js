// db.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function saveItem(item) {
    try {
        await prisma.test_bewakoof_fashion_data.upsert({
            where: { pid: item.pid },
            create: {
                pid:        item.pid,
                title:      item.title,
                price:      item.price,
                categories:  item.categories,
                rating:     item.rating,
                link:     item.link,
                image_link:  item.image,
            },
            update: {
                pid:        item.pid,
                title:      item.title,
                price:      item.price,
                categories:  item.categories,
                rating:     item.rating,
                link:     item.link,
                image_link:  item.image,
            },
        });
        console.log(`✅ Saved ${item.pid}`);
    } catch (e) {
        console.error(`❌ Prisma error for ${item.pid}:`, e.message);
    }
}
