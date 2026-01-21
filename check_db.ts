
import dotenv from 'dotenv';
dotenv.config();

import { db } from './src/database';
import { products } from './src/features/product/shared/product.schema';
import { eq, ilike, or } from 'drizzle-orm';

async function checkProduct() {
    console.log('Checking database for product...');

    try {
        // Check by exact slug
        const bySlug = await db.select().from(products).where(eq(products.slug, 'asdfasdf1'));
        console.log('By Slug "asdfasdf1":', bySlug.length > 0 ? 'FOUND' : 'NOT FOUND');
        if (bySlug.length > 0) console.log(bySlug[0]);

        // Check by title 'water1'
        const byTitle = await db.select().from(products).where(ilike(products.product_title, '%water1%'));
        console.log('By Title "water1":', byTitle.length > 0 ? 'FOUND' : 'NOT FOUND');
        if (byTitle.length > 0) console.log(byTitle.map(p => ({ id: p.id, slug: p.slug, title: p.product_title, status: p.status, is_deleted: p.is_deleted })));

        // Check by ID
        const byId = await db.select().from(products).where(eq(products.id, 'cc20dc99-98f1-47d9-8e50-48a3b1a19f68'));
        console.log('By ID "cc20dc99...":', byId.length > 0 ? 'FOUND' : 'NOT FOUND');
        if (byId.length > 0) console.log(byId.map(p => ({ id: p.id, slug: p.slug, title: p.product_title, status: p.status, is_deleted: p.is_deleted })));


    } catch (error) {
        console.error('Error querying DB:', error);
    } finally {
        process.exit(0);
    }
}

checkProduct();
