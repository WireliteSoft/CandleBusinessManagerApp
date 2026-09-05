export function normalizeHttpUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const withScheme = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function extractMetaContent(html, propertyName) {
  const escaped = propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexes = [
    new RegExp(`<meta[^>]*property=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${escaped}["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]*name=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${escaped}["'][^>]*>`, 'i'),
  ];

  for (const regex of regexes) {
    const match = html.match(regex);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

export function extractFirstImgSrc(html) {
  const match = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  return match?.[1]?.trim() || null;
}

export function toRowDates(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toRowDates);
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = value instanceof Date ? value.toISOString() : toRowDates(value);
  }
  return out;
}

export function parseOrThrow(schema, payload) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const error = new Error(parsed.error.issues.map((i) => i.message).join(', '));
    error.status = 400;
    throw error;
  }
  return parsed.data;
}

export function parseStringArrayJson(input) {
  try {
    const parsed = JSON.parse(String(input || '[]'));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => item.trim());
  } catch {
    return [];
  }
}

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  let raw = '';
  if (typeof forwarded === 'string' && forwarded.trim()) {
    raw = forwarded.split(',')[0].trim();
  } else if (Array.isArray(forwarded) && forwarded[0]) {
    raw = String(forwarded[0]).split(',')[0].trim();
  } else {
    raw = String(req.socket?.remoteAddress || req.ip || '');
  }
  const trimmed = raw.trim().toLowerCase();
  return trimmed.startsWith('::ffff:') ? trimmed.slice(7) : trimmed;
}
