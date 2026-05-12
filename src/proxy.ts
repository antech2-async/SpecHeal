import { NextRequest, NextResponse } from "next/server";

const allowedMethods = "GET, POST, OPTIONS";
const defaultAllowedHeaders = "Content-Type, Authorization";

function apiHeaders(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "*";
  const requestedHeaders =
    request.headers.get("access-control-request-headers") ?? defaultAllowedHeaders;

  return {
    "Access-Control-Allow-Headers": requestedHeaders,
    "Access-Control-Allow-Methods": allowedMethods,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Private-Network": "true",
    "Vary": "Origin, Access-Control-Request-Headers, Access-Control-Request-Private-Network"
  };
}

export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      headers: apiHeaders(request),
      status: 204
    });
  }

  const response = NextResponse.next();
  const headers = apiHeaders(request);

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: "/api/:path*"
};
