import { randomInt } from "crypto";
import { getPool } from "./db";

const CHARS =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Gera um slug aleatorio e garante que nao existe no banco
export async function generateUniqueSlug(length = 6) {
  const pool = getPool();
  let slug;
  let exists = true;

  do {
    slug = "";
    for (let i = 0; i < length; i++) {
      slug += CHARS[randomInt(0, CHARS.length)];
    }
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS total FROM links WHERE slug = ?",
      [slug]
    );
    exists = rows[0].total > 0;
  } while (exists);

  return slug;
}

// Valida um slug personalizado: apenas letras, numeros e hifens
export function isValidCustomSlug(slug) {
  return /^[a-zA-Z0-9-]+$/.test(slug) && slug.length <= 50;
}

// Valida se a URL informada e uma URL http/https valida
export function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
