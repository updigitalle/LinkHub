import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";

function homeUrl(request, query = "") {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return `${appUrl.replace(/\/$/, "")}/${query}`;
  }
  return new URL(`/${query}`, request.url);
}

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("links")
      .select("id, original_url")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("Erro ao buscar link:", error.message);
      return NextResponse.redirect(homeUrl(request, "?erro=link-nao-encontrado"));
    }

    const { error: updateError } = await supabase.rpc("increment_clicks", {
      slug_param: slug,
    });
    if (updateError) {
      console.error("Erro ao atualizar cliques:", updateError.message);
    }

    return NextResponse.redirect(data.original_url, 302);
  } catch (err) {
    console.error("Erro no redirecionamento:", err.message);
    return NextResponse.redirect(homeUrl(request, "?erro=falha-no-redirecionamento"));
  }
}