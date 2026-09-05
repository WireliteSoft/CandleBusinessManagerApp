import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const root = path.resolve(process.cwd());
const html = fs.readFileSync(path.join(root, 'items.txt'), 'utf8');
const entries = html.split('<div class="product" data-v-7d2f2f25=""').slice(1).map((block) => {
  const title = /class="name" title="([^"]+)"/.exec(block)?.[1]?.trim();
  const href = /href="([^"]+)" class="name"/.exec(block)?.[1] || '';
  const imageUrl = /<img[^>]+src="([^"]+)"/.exec(block)?.[1] || '';
  if (!title || !href) return null;
  const variants = [...block.matchAll(/<div class="product-input[^>]* sku="([^"]+)" price="([^"]+)"[^>]*>[\s\S]*?aria-label="([^"]+)"/g)].map((match) => ({ sku: match[1], price: Number(match[2]), label: match[3] }));
  const id = href.split('?')[0].replace(/^\/fragrance\//, '').replace(/\/$/, '');
  return { id, name: title.replace(/ \(Discontinued\)$/, ''), imageUrl, sourceUrl: `https://www.candlescience.com${href}`, variants, discontinued: /\(Discontinued\)/.test(title) };
}).filter(Boolean);

const statement = `CREATE TABLE IF NOT EXISTS "FragranceOilCatalog" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "image_url" TEXT NOT NULL DEFAULT '', "source_url" TEXT NOT NULL DEFAULT '', "variants_json" TEXT NOT NULL DEFAULT '[]', "discontinued" BOOLEAN NOT NULL DEFAULT 0, "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`;
const accountRoot = path.join(root, 'storage', 'accounts');
for (const file of fs.readdirSync(accountRoot).filter((name) => name.endsWith('.db'))) {
  const prisma = new PrismaClient({ datasources: { db: { url: `file:${path.join(accountRoot, file).replace(/\\/g, '/')}` } } });
  await prisma.$executeRawUnsafe(statement);
  for (const entry of entries) {
    const now = new Date().toISOString();
    await prisma.$executeRaw`INSERT INTO "FragranceOilCatalog" ("id", "name", "image_url", "source_url", "variants_json", "discontinued", "created_at", "updated_at") VALUES (${entry.id}, ${entry.name}, ${entry.imageUrl}, ${entry.sourceUrl}, ${JSON.stringify(entry.variants)}, ${entry.discontinued ? 1 : 0}, ${now}, ${now}) ON CONFLICT("id") DO UPDATE SET "name" = ${entry.name}, "image_url" = ${entry.imageUrl}, "source_url" = ${entry.sourceUrl}, "variants_json" = ${JSON.stringify(entry.variants)}, "discontinued" = ${entry.discontinued ? 1 : 0}, "updated_at" = ${now}`;
  }
  await prisma.$disconnect();
  console.log(`${file}: ${entries.length} fragrance oils imported`);
}
