import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import {
  generateUniqueSlug,
  isValidCustomSlug,
  isValidUrl,
} from "@/lib/slug";

export async function POST(request) {
  try {
    const { url, slug: customSlug } = await request.json();

    if (!isValidUrl(url)) {
      return NextResponse.json({ error: "URL inválida" }, { status: 400 });
    }

    const supabase = getSupabase();
    let slug;

    if (customSlug && customSlug.trim() !== "") {
      if (!isValidCustomSlug(customSlug)) {
        return NextResponse.json(
          { error: "Slug inválido. Use apenas letras, números e hífens." },
          { status: 400 }
        );
      }
      const { count } = await supabase
        .from("links")
        .select("*", { count: "exact", head: true })
        .eq("slug", customSlug);
      if (count > 0) {
        return NextResponse.json(
          { error: "Este slug já está em uso. Escolha outro." },
          { status: 409 }
        );
      }
      slug = customSlug;
    } else {
      slug = await generateUniqueSlug();
    }

    const { error } = await supabase
      .from("links")
      .insert({ original_url: url, slug });

    if (error) throw error;

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