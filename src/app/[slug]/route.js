import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/db";

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
      return NextResponse.redirect(new URL("/", request.url));
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
    return NextResponse.redirect(new URL("/", request.url));
  }
}