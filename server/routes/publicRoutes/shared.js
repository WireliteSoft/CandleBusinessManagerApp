export async function findAccountByStoreSlug(masterPrisma, slug) {
  const rows = await masterPrisma.$queryRaw`
    SELECT "id", "name", "plan_tier", "store_slug", "store_title", "store_description", "store_logo_data", "store_banner_data", "store_background_image_data", "store_custom_html", "store_custom_full_mode", "store_show_details", "store_product_ids"
    FROM "Account"
    WHERE "store_slug" = ${slug}
    LIMIT 1
  `;
  return rows[0] || null;
}

export function requireStoreSlug(res, slug) {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) {
    res.status(400).json({ error: 'Invalid store slug' });
    return null;
  }
  return normalized;
}
