import { NextRequest, NextResponse } from "next/server";
import specs from "@/risk/specs/perils.v1.json";
import { pricePolicy } from "@/risk/src/price";
import type { PerilSpec, QuoteInput, Regime } from "@/risk/src/types";
import specs from "@/risk/specs/perils.v1.json";

type Body = {
  perilId: string;
  regime?: Regime;
  limitUSD?: number;
  attachmentPct?: number;     // 0..1
  tenorDays?: number;         // e.g., 30
  utilization?: number;       // portfolio util 0..1
  tvar99_headroom_usd?: number;
};

function getPeril(perilId: string): PerilSpec {
  const peril = (specs as any).perils.find((p: any) => p.id === perilId);
  if (!peril) throw new Error(`Unknown perilId: ${perilId}`);
  return peril as PerilSpec;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    const peril = getPeril(body.perilId);
    const regime: Regime = body.regime ?? "volatile";

    const limitUSD = body.limitUSD ?? 1_000_000;
    const attachmentPct = Math.max(0, Math.min(1, body.attachmentPct ?? 0));
    const tenorDays = body.tenorDays ?? 30;

    const utilization = Math.max(0, Math.min(1, body.utilization ?? 0.35));
    const tvar99_headroom_usd = Math.max(0, body.tvar99_headroom_usd ?? 5_000_000);

    const q: QuoteInput = {
      perilId: peril.id,
      regime,
      notionalUSD: limitUSD,           // parametric – use limit as notional anchor
      attachmentPct,
      limitUSD,
      tenorDays,
      portfolio: { utilization, tvar99_headroom_usd },
      curve: peril
    };

    const res = pricePolicy(q);

    return NextResponse.json(
      {
        ok: true,
        input: q,
        breakdown: res
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "unknown_error" }, { status: 400 });
  }
}

/** Optional GET for quick browser testing with query params */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const perilId = url.searchParams.get("perilId");
  if (!perilId) return NextResponse.json({ ok: false, error: "perilId required" }, { status: 400 });

  const regime = (url.searchParams.get("regime") as Regime) ?? "volatile";
  const limitUSD = Number(url.searchParams.get("limitUSD") ?? 1_000_000);
  const attachmentPct = Number(url.searchParams.get("attachmentPct") ?? 0);
  const tenorDays = Number(url.searchParams.get("tenorDays") ?? 30);
  const utilization = Number(url.searchParams.get("utilization") ?? 0.35);
  const headroom = Number(url.searchParams.get("tvar99_headroom_usd") ?? 5_000_000);

  try {
    const peril = getPeril(perilId);
    const q: QuoteInput = {
      perilId: peril.id,
      regime,
      notionalUSD: limitUSD,
      attachmentPct: Math.max(0, Math.min(1, attachmentPct)),
      limitUSD,
      tenorDays,
      portfolio: { utilization: Math.max(0, Math.min(1, utilization)), tvar99_headroom_usd: Math.max(0, headroom) },
      curve: peril
    };
    const res = pricePolicy(q);
    return NextResponse.json({ ok: true, input: q, breakdown: res }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "unknown_error" }, { status: 400 });
  }
}
