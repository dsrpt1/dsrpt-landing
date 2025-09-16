import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Prisma requires the Node runtime in Vercel/App Router
export const runtime = "nodejs";

// Save a quote: { wallet?, input, breakdown }
export async function POST(req: NextRequest) {
  try {
    const { wallet, input, breakdown } = await req.json();

    if (!input || !breakdown) {
      return NextResponse.json({ ok: false, error: "missing input/breakdown" }, { status: 400 });
    }

    const rec = await prisma.quote.create({
      data: {
        wallet: wallet ?? null,
        perilId: input.perilId,
        regime: input.regime,
        limitUSD: Math.round(input.limitUSD),
        attachmentPct: input.attachmentPct ?? 0,
        tenorDays: input.tenorDays,
        utilization: input.portfolio?.utilization ?? 0,
        headroomUSD: Math.round(input.portfolio?.tvar99_headroom_usd ?? 0),
        premiumUSD: breakdown?.premium ?? 0,
        EL: breakdown?.EL ?? 0,
        RL: breakdown?.RL ?? 0,
        LL: breakdown?.LL ?? 0,
        OH: breakdown?.O_H ?? 0,
        payload: { input, breakdown },
      },
    });

    return NextResponse.json({ ok: true, id: rec.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server_error" }, { status: 500 });
  }
}
