import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";
import {
  generateUniqueSlug,
  isValidCustomSlug,
  isValidUrl,
} from "@/lib/slug";

function checkEnvVars() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    const missing = [];
    if (!process.env.SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!process.env.SUPABASE_ANON_KEY) missing.push("SUPABASE_ANON_KEY");
    throw new Error(`Variáveis de ambiente ausentes: ${missing.join(", ")}`);
  }
}

export async function POST(request) {
  try {
    checkEnvVars();
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

    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const host = request.headers.get("host");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const effectiveHost = forwardedHost || host || appUrl?.replace(/^https?:\/\//, "");
    const effectiveProto = forwardedProto || (effectiveHost && effectiveHost.startsWith("localhost") ? "http" : "https");
    const shortUrl = appUrl ? `${appUrl}/${slug}` : `${effectiveProto}://${effectiveHost}/${slug}`;

    return NextResponse.json({ success: true, shortUrl });
  } catch (err) {
    console.error("Erro ao encurtar:", err);
    return NextResponse.json(
      { error: err.message || "Erro ao encurtar o link. Tente novamente." },
      { status: 500 }
    );
  }
}