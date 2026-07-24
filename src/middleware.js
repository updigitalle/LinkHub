import { NextResponse } from "next/server";

// Espelha o comportamento do .htaccess original: forca HTTPS e remove o "www."
export function middleware(request) {
  const url = request.nextUrl.clone();
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (isLocal) {
    return NextResponse.next();
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isHttps = forwardedProto ? forwardedProto === "https" : url.protocol === "https:";
  const hasWww = url.hostname.startsWith("www.");

  if (!isHttps || hasWww) {
    url.protocol = "https:";
    if (hasWww) {
      url.hostname = url.hostname.replace(/^www\./, "");
    }
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
