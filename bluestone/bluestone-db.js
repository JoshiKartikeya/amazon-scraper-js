// db.js
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

export async function saveItem(item) {
    try {
        await prisma.test_bluestone_fashion_data.upsert({
            where: {pCode: item.pCode},
            create: {
                pCode: item.pCode,
                title: item.title,
                price: item.price,
                categories: item.categories,
                link: item.link,
                image_link: item.image,
            },
            update: {
                pCode: item.pCode,
                title: item.title,
                price: item.price,
                categories: item.categories,
                link: item.link,
                image_link: item.image,
            },
        });
        console.log(`✅ Saved ${item.pCode}`);
    } catch (e) {
        console.error(`❌ Prisma error for ${item.pCode}:`, e.message);
    }
}
