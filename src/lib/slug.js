import { randomInt } from "crypto";
import { getSupabase } from "./db";

const CHARS =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export async function generateUniqueSlug(length = 6) {
  const supabase = getSupabase();
  let slug;
  let exists = true;

  do {
    slug = "";
    for (let i = 0; i < length; i++) {
      slug += CHARS[randomInt(0, CHARS.length)];
    }
    const { count } = await supabase
      .from("links")
      .select("*", { count: "exact", head: true })
      .eq("slug", slug);
    exists = count > 0;
  } while (exists);

  return slug;
}

export function isValidCustomSlug(slug) {
  return /^[a-zA-Z0-9-]+$/.test(slug) && slug.length <= 50;
}

export function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}