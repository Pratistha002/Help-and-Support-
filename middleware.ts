import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/lib/server/cors";

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  Object.entries(headers).forEach(([key, value]) => {
    if (typeof value === "string") response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
