import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Only redirect if user is on the risk subdomain *and* at the root path
  if (url.hostname === "risk.dsrpt.finance" && url.pathname === "/") {
    url.pathname = "/quote";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Run on the root path only (fast)
export const config = { matcher: ["/"] };
