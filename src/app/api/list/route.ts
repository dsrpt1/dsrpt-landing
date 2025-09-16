import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const wallet = url.searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ ok: false, error: "wallet required" }, { status: 400 });

  const rows = await prisma.policy.findMany({
    where: { wallet: wallet.toLowerCase() },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, policies: rows }, { status: 200 });
}
