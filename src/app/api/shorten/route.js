import { NextResponse } from "next/server";
import { getPool, ensureSchema } from "@/lib/db";
import {
  generateUniqueSlug,
  isValidCustomSlug,
  isValidUrl,
} from "@/lib/slug";

export async function POST(request) {
  try {
    await ensureSchema();

    const { url, slug: customSlug } = await request.json();

    if (!isValidUrl(url)) {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }

    const pool = getPool();
    let slug;

    if (customSlug && customSlug.trim() !== "") {
      if (!isValidCustomSlug(customSlug)) {
        return NextResponse.json(
          { error: "Slug inválido. Use apenas letras, números e hífens." },
          { status: 400 }
        );
      }
      const [rows] = await pool.query(
        "SELECT COUNT(*) AS total FROM links WHERE slug = ?",
        [customSlug]
      );
      if (rows[0].total > 0) {
        return NextResponse.json(
          { error: "Este slug já está em uso. Escolha outro." },
          { status: 409 }
        );
      }
      slug = customSlug;
    } else {
      slug = await generateUniqueSlug();
    }

    await pool.query(
      "INSERT INTO links (original_url, slug) VALUES (?, ?)",
      [url, slug]
    );

    const host = request.headers.get("host");
    const protocol = host && host.startsWith("localhost") ? "http" : "https";
    const shortUrl = `${protocol}://${host}/${slug}`;

    return NextResponse.json({ success: true, shortUrl });
  } catch (err) {
    console.error("Erro ao encurtar:", err.message);
    return NextResponse.json(
      { error: "Erro ao encurtar o link. Tente novamente." },
      { status: 500 }
    );
  }
}