import { NextResponse } from "next/server";
import { getPool, ensureSchema } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    await ensureSchema();
    const { slug } = await params;

    const pool = getPool();
    const [rows] = await pool.query(
      "SELECT original_url FROM links WHERE slug = ?",
      [slug]
    );

    if (rows.length === 0) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    await pool.query(
      "UPDATE links SET clicks = clicks + 1 WHERE slug = ?",
      [slug]
    );

    return NextResponse.redirect(rows[0].original_url, 302);
  } catch (err) {
    console.error("Erro no redirecionamento:", err.message);
    return NextResponse.redirect(new URL("/", request.url));
  }
}