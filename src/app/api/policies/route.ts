import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Save policy after onchain mint
// Body: { wallet, tokenId, chainId, contract, perilId, limitUSD, attachmentPct, tenorDays, premiumUSD, txHash, metadataCID, metadataURI }
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();

    // minimal validation
    const required = ["wallet", "tokenId", "chainId", "contract", "perilId", "limitUSD", "tenorDays"];
    const missing = required.filter((k) => b[k] === undefined || b[k] === null || b[k] === "");
    if (missing.length) {
      return NextResponse.json({ ok: false, error: `missing: ${missing.join(", ")}` }, { status: 400 });
    }

    const rec = await prisma.policy.create({
      data: {
        wallet: b.wallet,
        tokenId: String(b.tokenId),
        chainId: Number(b.chainId),
        contract: b.contract,
        perilId: b.perilId,
        limitUSD: Math.round(b.limitUSD),
        attachmentPct: Number(b.attachmentPct ?? 0),
        tenorDays: Number(b.tenorDays),
        premiumUSD: Number(b.premiumUSD ?? 0),
        txHash: b.txHash ?? "",
        metadataCID: b.metadataCID ?? "",
        metadataURI: b.metadataURI ?? "",
      },
    });

    return NextResponse.json({ ok: true, id: rec.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server_error" }, { status: 500 });
  }
}
